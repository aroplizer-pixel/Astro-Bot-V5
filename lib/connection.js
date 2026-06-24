import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { logger } from './logger.js';
import { database } from './db.js';
import { recordFailure, recordSuccess } from './restart.js';
import { getMessageText } from './utils.js';
import path from 'path';
import config from '../config.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { transcodeAudioToOpus } from './transcoder.js';
import { generateContentLive } from './live_gemini.js';

export async function connectToWhatsApp(handleMessage) {
    const { state, saveCreds } = await useMultiFileAuthState(path.resolve('./session'));
    const { version, isLatest } = await fetchLatestBaileysVersion();

    logger.info(`إصدار Baileys: ${version.join('.')}, الأحدث: ${isLatest}`);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['KnightBot MD', 'Chrome', '2.0.0'],
        // إعدادات استقرار إضافية
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        markOnlineOnConnect: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            logger.info('📷 امسح رمز QR التالي للاتصال:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true;

            logger.warn(`🔌 تم إغلاق الاتصال. السبب: ${lastDisconnect?.error?.message || lastDisconnect?.error}. إعادة المحاولة: ${shouldReconnect}`);

            if (shouldReconnect) {
                const { shouldRetry, delayMs } = recordFailure();
                if (shouldRetry) {
                    setTimeout(() => connectToWhatsApp(handleMessage), delayMs);
                }
            } else {
                logger.error('🚫 تم تسجيل الخروج نهائياً. احذف مجلد session وامسح QR من جديد.');
            }
        } else if (connection === 'open') {
            recordSuccess();
            logger.success('✅ تم الاتصال بـ WhatsApp بنجاح!');
        }
    });

    // الترحيب والمغادرة التلقائي للأعضاء الجدد والراحلين (مع إدراج صورة الملف الشخصي وتنسيق فاخر)
    sock.ev.on('group-participants.update', async (anu) => {
        try {
            const { id, participants, action } = anu;
            const groupDb = database.getGroup(id);

            if (action === 'add' && groupDb.welcome) {
                for (const num of participants) {
                    const userNumber = num.split('@')[0];
                    let welcomeMsg = groupDb.welcomeMessage;
                    if (!welcomeMsg || welcomeMsg === 'مرحباً بك يا @user في المجموعة! 👋') {
                        welcomeMsg = `🌟 *ترحيب حار بطلنا الجديد!* 🌟\n\n👋 أهلاً وسهلاً بك يا @user في مجموعتنا المتواضعة! ✨\n\n💞 نورت قلوبنا وجروبنا بوجودك الراقي، نتمنى لك قضاء أسعد الأوقات وأجملها بصحبتنا! 🥳🎉`;
                    }
                    welcomeMsg = welcomeMsg.replace(/@user/g, `@${userNumber}`);
                    
                    let ppUrl = null;
                    try {
                        ppUrl = await sock.profilePictureUrl(num, 'image');
                    } catch (_) {}

                    if (ppUrl) {
                        await sock.sendMessage(id, {
                            image: { url: ppUrl },
                            caption: welcomeMsg,
                            mentions: [num]
                        });
                    } else {
                        await sock.sendMessage(id, {
                            text: welcomeMsg,
                            mentions: [num]
                        });
                    }
                }
            } else if (action === 'remove' && groupDb.welcome) {
                for (const num of participants) {
                    const userNumber = num.split('@')[0];
                    let goodbyeMsg = groupDb.goodbyeMessage;
                    if (!goodbyeMsg || goodbyeMsg === 'وداعاً يا @user.. 🥺') {
                        goodbyeMsg = `🥀 *لحظة وداع حزينة..* 🥀\n\n💔 للأسف غادرنا اليوم العضو @user.. 🥺\n\nسنفتقد حضورك الجميل وكلماتك الطيبة بيننا، نتمنى لك كل التوفيق والخير في طريقك القادم! 🥀💔`;
                    }
                    goodbyeMsg = goodbyeMsg.replace(/@user/g, `@${userNumber}`);
                    
                    let ppUrl = null;
                    try {
                        ppUrl = await sock.profilePictureUrl(num, 'image');
                    } catch (_) {}

                    if (ppUrl) {
                        await sock.sendMessage(id, {
                            image: { url: ppUrl },
                            caption: goodbyeMsg,
                            mentions: [num]
                        });
                    } else {
                        await sock.sendMessage(id, {
                            text: goodbyeMsg,
                            mentions: [num]
                        });
                    }
                }
            }
        } catch (e) {
            logger.error('Error handling group-participants.update event:', e);
        }
    });

    // استلام الرسائل وتمريرها للمعالج
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                try {
                    const body = getMessageText(msg);

                    // تسجيل كل الرسائل الواردة للتصحيح البرمجي ومعرفة المشكلة
                    const sender = msg.key.participant || msg.key.remoteJid;
                    logger.info(`[Msg] From: ${sender.split('@')[0]} | fromMe: ${msg.key.fromMe ? 'Bot' : 'User'} | Text: "${body?.slice(0, 80) || ''}"`);

                    // تجاهل الرسائل الصادرة من البوت نفسه (لتفادي حلقة الردود اللانهائية)
                    const isFromMe = msg.key.fromMe;
                    if (isFromMe) {
                        const hasPrefix = body.startsWith(config.prefix);
                        if (!hasPrefix) {
                            continue;
                        }
                    }

                    await handleMessage(sock, msg);
                } catch (err) {
                    logger.error('خطأ في معالجة الرسالة:', err);
                }
            }
        }
    });

    // التعامل مع المكالمات الواردة بالذكاء الاصطناعي
    sock.ev.on('call', async (calls) => {
        for (const call of calls) {
            if (call.status === 'offer') {
                const callId = call.id;
                const from = call.from;
                logger.info(`📞 مكالمة واردة من: ${from.split('@')[0]} (معرف المكالمة: ${callId})`);

                try {
                    // رفض المكالمة أولاً لمنع الرنين المستمر
                    await sock.rejectCall(callId, from);
                    logger.info(`🚫 تم رفض المكالمة من ${from.split('@')[0]} بنجاح.`);

                    // التحقق من تفعيل مفتاح Gemini
                    if (config.geminiApiKey && config.geminiApiKey.trim() !== '') {
                        logger.info(`🎙️ جاري توليد رد صوتي ذكي للمكالمة عبر Gemini Live API...`);
                        
                        const liveRes = await generateContentLive({
                            apiKey: config.geminiApiKey,
                            model: 'gemini-3.1-flash-live-preview',
                            contents: [{ role: 'user', parts: [{ text: 'أهلاً يا أسترو، أنا اتصلت بيك' }] }],
                            systemInstruction: `أنت "أسترو" (Astro)، شاب مصري فرفوش ولطيف ومرح وعنده 21 سنة. يتحدث فقط بالعامية المصرية الدارجة والشعبية. أحد المستخدمين اتصل بك للتو مكالمة هاتفية على واتساب. رد عليه بـ ريكورد صوتي قصير ومحبب توضح فيه بلطف وخفة دم أنك لا تستطيع الرد على المكالمات الهاتفية، وتطلب منه إرسال رسالة صوتية (ريكورد) أو كتابية هنا لكي تتحدثا فوراً.`,
                            responseModalities: ['AUDIO'],
                            voiceName: 'Puck'
                        });

                        if (liveRes.audioBuffer) {
                            const oggBuffer = await transcodeAudioToOpus(liveRes.audioBuffer);

                            await sock.sendMessage(from, {
                                audio: oggBuffer,
                                mimetype: 'audio/ogg; codecs=opus',
                                ptt: true
                            });
                            logger.success(`✅ تم إرسال الرد الصوتي للمكالمة بنجاح إلى ${from.split('@')[0]}`);
                        } else {
                            // رد نصي احتياطي في حال فشل الصوت
                            await sock.sendMessage(from, {
                                text: liveRes.text || 'يا هلا يا برو! 🌟 معلش أنا مش بقدر أرد على مكالمات الواتساب مباشرة، ابعتلي ريكورد صوتي هنا وهرد عليك بصوتي فوراً! 😉'
                            });
                        }
                    } else {
                        // رد نصي افتراضي في حال عدم وجود مفتاح
                        await sock.sendMessage(from, {
                            text: 'يا هلا يا برو! 🌟 معلش أنا مش بقدر أرد على مكالمات الواتساب مباشرة، ابعتلي ريكورد صوتي هنا وهرد عليك بصوتي فوراً! 😉'
                        });
                    }
                } catch (err) {
                    logger.error(`❌ فشل معالجة المكالمة الواردة:`, err.message);
                }
            }
        }
    });

    return sock;
}
