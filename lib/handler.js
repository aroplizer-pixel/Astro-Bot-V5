import config from '../config.js';
import { logger } from './logger.js';
import { database } from './db.js';
import { activeGames } from './games.js';
import { saveMessage, getMessage } from './store.js';
import { getMessageText } from './utils.js';
import { downloadMedia } from './media.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const commands = new Map();

// متتبع السبام (لأغراض مكافحة الرسائل السريعة المزعجة)
const spamTracker = new Map();

// ذاكرة تخزين مؤقت لبيانات المجموعات لتفادي كثرة طلبها من الخادم (Rate Limit) وتجنب توقف البوت
const metadataCache = new Map();
const METADATA_TTL_MS = 2 * 60 * 1000; // دقيقتين
const METADATA_MAX_ENTRIES = 200;

// تنظيف دوري للكاش المهمل كل 5 دقائق لتقليل استهلاك الرام
setInterval(() => {
    const now = Date.now();
    for (const [jid, entry] of metadataCache.entries()) {
        if (now - entry.timestamp > METADATA_TTL_MS * 2) {
            metadataCache.delete(jid);
        }
    }
    // منع نمو الكاش بلا حدود
    if (metadataCache.size > METADATA_MAX_ENTRIES) {
        const keysToDelete = [...metadataCache.keys()].slice(0, metadataCache.size - METADATA_MAX_ENTRIES);
        keysToDelete.forEach(k => metadataCache.delete(k));
    }
}, 5 * 60 * 1000);

async function getGroupMetadata(sock, jid) {
    const now = Date.now();
    const cached = metadataCache.get(jid);
    if (cached && (now - cached.timestamp < METADATA_TTL_MS)) {
        return cached.metadata;
    }
    try {
        const metadata = await sock.groupMetadata(jid);
        metadataCache.set(jid, { metadata, timestamp: now });
        return metadata;
    } catch (e) {
        logger.error(`فشل جلب بيانات المجموعة ${jid}:`, e);
        return cached ? cached.metadata : null;
    }
}

/**
 * تحقق سريع من كون المرسل مشرفاً في المجموعة (مع كاش)
 */
export async function checkSenderAdmin(sock, from, sender) {
    const metadata = await getGroupMetadata(sock, from);
    if (!metadata) return { isSenderAdmin: false, isBotAdmin: false, admins: [] };
    const admins = metadata.participants.filter(p => p.admin !== null).map(p => p.id);
    return {
        isSenderAdmin: admins.includes(sender),
        isBotAdmin: admins.includes(sock.user.id.split(':')[0] + '@s.whatsapp.net'),
        admins
    };
}

/**
 * تسجيل أمر جديد في البوت
 */
export function registerCommand(name, execute, options = {}) {
    commands.set(name.toLowerCase(), {
        execute,
        description: options.description || 'لا يوجد وصف',
        category: options.category || 'عام',
        ownerOnly: options.ownerOnly || false,
        groupOnly: options.groupOnly || false,
        adminOnly: options.adminOnly || false,
        botAdminRequired: options.botAdminRequired || false
    });
}

/**
 * تحميل جميع الإضافات ديناميكياً من مجلد plugins
 */
export async function loadPlugins(dir = path.join(__dirname, '../plugins')) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        return;
    }

    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            await loadPlugins(fullPath);
        } else if (file.endsWith('.js')) {
            try {
                const fileUrl = pathToFileURL(fullPath).href;
                await import(fileUrl);
            } catch (err) {
                logger.error(`Failed to load plugin: ${file}`, err);
            }
        }
    }
}

/**
 * استخراج محتوى الوسائط ونوعها للـ Context
 */
function getMediaContent(msg) {
    if (!msg?.message) return null;
    
    let m = msg.message;
    if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    else if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    else if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    
    if (m.imageMessage) return { messageContent: m.imageMessage, type: 'image', mimeType: m.imageMessage.mimetype || 'image/jpeg' };
    if (m.audioMessage) return { messageContent: m.audioMessage, type: 'audio', mimeType: m.audioMessage.mimetype || 'audio/ogg; codecs=opus' };
    if (m.videoMessage) return { messageContent: m.videoMessage, type: 'video', mimeType: m.videoMessage.mimetype || 'video/mp4' };
    if (m.stickerMessage) return { messageContent: m.stickerMessage, type: 'sticker', mimeType: m.stickerMessage.mimetype || 'image/webp' };
    
    const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted) {
        let q = quoted;
        if (q.viewOnceMessage?.message) q = q.viewOnceMessage.message;
        else if (q.viewOnceMessageV2?.message) q = q.viewOnceMessageV2.message;
        else if (q.ephemeralMessage?.message) q = q.ephemeralMessage.message;
        
        if (q.imageMessage) return { messageContent: q.imageMessage, type: 'image', mimeType: q.imageMessage.mimetype || 'image/jpeg' };
        if (q.audioMessage) return { messageContent: q.audioMessage, type: 'audio', mimeType: q.audioMessage.mimetype || 'audio/ogg; codecs=opus' };
        if (q.videoMessage) return { messageContent: q.videoMessage, type: 'video', mimeType: q.videoMessage.mimetype || 'video/mp4' };
        if (q.stickerMessage) return { messageContent: q.stickerMessage, type: 'sticker', mimeType: q.stickerMessage.mimetype || 'image/webp' };
    }
    
    return null;
}

/**
 * معالج الرسائل الواردة
 */
export async function handleMessage(sock, msg) {
    // حفظ الرسالة فوراً في الذاكرة لتتبع عمليات الحذف أو التعديل لاحقاً
    saveMessage(msg);

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');

    // ═══════════════════════════════════════════════════════
    // أ. كشف ومعالجة مضاد حذف الرسائل (Anti-Delete)
    // ═══════════════════════════════════════════════════════
    const protocolMsg = msg.message?.protocolMessage;
    if (protocolMsg && protocolMsg.type === 3) {
        if (isGroup) {
            try {
                const groupDb = database.getGroup(from);
                if (groupDb.antiDelete) {
                    const originalMsg = getMessage(protocolMsg.key.id);
                    if (originalMsg) {
                        const deletedSender = originalMsg.key.participant || originalMsg.key.remoteJid;
                        const deletedSenderNumber = deletedSender.split('@')[0];
                        
                        let originalBody = '';
                        let mediaType = null;
                        let mediaMsg = null;

                        if (originalMsg.message) {
                            originalBody = originalMsg.message.conversation || 
                                           originalMsg.message.extendedTextMessage?.text || 
                                           originalMsg.message.imageMessage?.caption || 
                                           originalMsg.message.videoMessage?.caption || 
                                           '';

                            if (originalMsg.message.imageMessage) {
                                mediaType = 'image';
                                mediaMsg = originalMsg.message.imageMessage;
                            } else if (originalMsg.message.videoMessage) {
                                mediaType = 'video';
                                mediaMsg = originalMsg.message.videoMessage;
                            } else if (originalMsg.message.stickerMessage) {
                                mediaType = 'sticker';
                                mediaMsg = originalMsg.message.stickerMessage;
                            }
                        }

                        const notificationText = `👀 *تم رصد محاولة حذف رسالة!* \n👤 *المرسل:* @${deletedSenderNumber}\n\n`;

                        if (mediaType) {
                            const { downloadMedia } = await import('./media.js');
                            const buffer = await downloadMedia(mediaMsg, mediaType);

                            if (mediaType === 'image') {
                                await sock.sendMessage(from, { 
                                    image: buffer, 
                                    caption: notificationText + (originalBody ? `📝 التعليق: ${originalBody}` : ''), 
                                    mentions: [deletedSender] 
                                });
                            } else if (mediaType === 'video') {
                                await sock.sendMessage(from, { 
                                    video: buffer, 
                                    caption: notificationText + (originalBody ? `📝 التعليق: ${originalBody}` : ''), 
                                    mentions: [deletedSender] 
                                });
                            } else if (mediaType === 'sticker') {
                                await sock.sendMessage(from, { text: notificationText, mentions: [deletedSender] });
                                await sock.sendMessage(from, { sticker: buffer });
                            }
                        } else {
                            await sock.sendMessage(from, {
                                text: notificationText + `📝 *محتوى الرسالة:* \n"${originalBody}"`,
                                mentions: [deletedSender]
                            });
                        }
                    }
                }
            } catch (e) {
                logger.error('Error in anti-delete detector:', e);
            }
        }
        return; // توقف عن المعالجة
    }
    
    // استخراج نص الرسالة العادية باستخدام الدالة المشتركة لضمان دعم الأزرار
    const body = getMessageText(msg);

    const sender = msg.key.participant || msg.key.remoteJid;
    const senderNumber = sender.split('@')[0];
    
    const isOwner = senderNumber === config.ownerNumber;

    // ═══════════════════════════════════════════════════════
    // 1. نظام الحماية (Anti-Link, Anti-Spam, Anti-Badword) ونظام المستويات (XP)
    // ═══════════════════════════════════════════════════════
    if (isGroup) {
        try {
            const groupDb = database.getGroup(from);
            const userDb = database.getUser(sender);

            // أ. ترقية المستوى عند التفاعل
            const xpGain = Math.floor(Math.random() * 11) + 5; // 5-15 XP
            let newXp = userDb.xp + xpGain;
            let newLevel = userDb.level;
            const xpNeeded = newLevel * 150; // XP المطلوب للمستوى التالي

            if (newXp >= xpNeeded) {
                newLevel += 1;
                newXp = newXp - xpNeeded;
                await sock.sendMessage(from, { 
                    text: `🎉 مبروك يا @${senderNumber}! لقد ارتفع مستواك إلى *${newLevel}*! 🚀`,
                    mentions: [sender]
                });
            }
            database.updateUser(sender, { xp: newXp, level: newLevel });

            // جلب قائمة المشرفين بأمان باستخدام الكاش المطور
            const groupMetadata = await getGroupMetadata(sock, from);
            if (groupMetadata) {
                const admins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
                const isSenderAdmin = admins.includes(sender);
                const isBotAdmin = admins.includes(sock.user.id.split(':')[0] + '@s.whatsapp.net');

                // ب. كشف الروابط (Anti-Link)
                if (groupDb.antiLink && !isOwner && !isSenderAdmin) {
                    const hasLink = /(https?:\/\/[^\s]+|chat\.whatsapp\.com\/[^\s]+|wa\.me\/[^\s]+)/gi.test(body);
                    if (hasLink) {
                        if (isBotAdmin) {
                            logger.info(`Anti-Link triggered: Deleting link from ${senderNumber}`);
                            await sock.sendMessage(from, { delete: msg.key });
                            await sock.groupParticipantsUpdate(from, [sender], 'remove');
                            await sock.sendMessage(from, {
                                text: `🛡️ تم طرد @${senderNumber} لإرساله رابط في المجموعة ومخالفته القوانين.`,
                                mentions: [sender]
                            });
                            return; 
                        }
                    }
                }

                // ج. كشف السبام (Anti-Spam)
                if (groupDb.antiSpam && !isOwner && !isSenderAdmin) {
                    const now = Date.now();
                    const userSpamKey = `${from}_${sender}`;
                    let userMsgs = spamTracker.get(userSpamKey) || [];
                    userMsgs = userMsgs.filter(t => now - t < 3000); 
                    userMsgs.push(now);
                    spamTracker.set(userSpamKey, userMsgs);

                    if (userMsgs.length > 5) {
                        const warnings = (userDb.warnings || 0) + 1;
                        database.updateUser(sender, { warnings });
                        spamTracker.delete(userSpamKey); 

                        if (warnings >= 3) {
                            if (isBotAdmin) {
                                await sock.groupParticipantsUpdate(from, [sender], 'remove');
                                await sock.sendMessage(from, {
                                    text: `🛡️ تم طرد @${senderNumber} بسبب تكرار إرسال الرسائل المزعجة (السبام).`,
                                    mentions: [sender]
                                });
                            } else {
                                await sock.sendMessage(from, {
                                    text: `⚠️ @${senderNumber} يقوم بعمل سبام! يرجى طرده (البوت ليس مشرفاً).`,
                                    mentions: [sender]
                                });
                            }
                            database.updateUser(sender, { warnings: 0 });
                        } else {
                            await sock.sendMessage(from, {
                                text: `⚠️ تنبيه يا @${senderNumber}! يرجى التوقف عن السبام السريع. التحذير رقم (${warnings}/3).`,
                                mentions: [sender]
                            });
                        }
                        return; 
                    }
                }

                // د. كشف الكلمات البذيئة (Anti-Badword)
                if (groupDb.antiBadwords && !isOwner && !isSenderAdmin) {
                    const hasBadWord = config.badWords.some(word => body.toLowerCase().includes(word.toLowerCase()));
                    if (hasBadWord) {
                        const warnings = (userDb.warnings || 0) + 1;
                        database.updateUser(sender, { warnings });

                        if (isBotAdmin) {
                            await sock.sendMessage(from, { delete: msg.key }); 
                        }

                        if (warnings >= 3) {
                            if (isBotAdmin) {
                                await sock.groupParticipantsUpdate(from, [sender], 'remove');
                                await sock.sendMessage(from, {
                                    text: `🛡️ تم طرد @${senderNumber} بسبب تكرار استخدام الكلمات البذيئة.`,
                                    mentions: [sender]
                                });
                            } else {
                                await sock.sendMessage(from, {
                                    text: `⚠️ @${senderNumber} يكرر الشتم! يرجى طرده.`,
                                    mentions: [sender]
                                });
                            }
                            database.updateUser(sender, { warnings: 0 });
                        } else {
                            await sock.sendMessage(from, {
                                text: `⚠️ ممنوع الشتم يا @${senderNumber}! تم حذف الرسالة. التحذير رقم (${warnings}/3).`,
                                mentions: [sender]
                            });
                        }
                        return; 
                    }
                }

                // هـ. كاشف المشاعر والمشاحنات وتدخل البوت للتهدئة
                const fightingWords = ['اخرس', 'انقلع', 'انجب', 'كل تبن', 'انكتم', 'يا تافه', 'يا فاشل'];
                const isFighting = fightingWords.some(word => body.toLowerCase().includes(word));
                if (isFighting && !isSenderAdmin && !isOwner) {
                    await sock.sendMessage(from, {
                        text: `🤫 هدوء يا شباب، دعونا نحافظ على الاحترام المتبادل داخل المجموعة! 🌸\nلا داعي للمشاحنات العصبية. ✨`
                    }, { quoted: msg });
                }
            }
        } catch (err) {
            logger.error('Error inside isGroup handleMessage preprocessing:', err);
        }
    }

    // ═══════════════════════════════════════════════════════
    // 2. فحص الألعاب النشطة والتحقق من الإجابات
    // ═══════════════════════════════════════════════════════
    if (isGroup) {
        try {
            const game = activeGames.get(from);
            if (game && game.type === 'math') {
                const answer = parseInt(body.trim());
                if (!isNaN(answer) && answer === game.answer) {
                    activeGames.delete(from);
                    const prize = game.prize;
                    const userDb = database.getUser(sender);
                    database.updateUser(sender, { wallet: userDb.wallet + prize });
                    await sock.sendMessage(from, {
                        text: `🎉 إجابة صحيحة يا @${senderNumber}! الجواب هو *${game.answer}*.\n🏆 لقد فزت بـ *${prize}* عملة ذهبية!`,
                        mentions: [sender]
                    }, { quoted: msg });
                    return;
                }
            }

            // فحص أسئلة الثقافة (trivia)
            if (game && game.type === 'trivia') {
                const trimmed = body.trim();
                // قبول الرقم أو النص
                const numAnswer = parseInt(trimmed);
                if (numAnswer === 1 || numAnswer === 2 || numAnswer === 3 || numAnswer === 4) {
                    const isCorrect = trimmed === game.answerIndex;
                    if (isCorrect) {
                        activeGames.delete(from);
                        const prize = game.prize;
                        const userDb = database.getUser(sender);
                        database.updateUser(sender, { wallet: userDb.wallet + prize });
                        await sock.sendMessage(from, {
                            text: `🧠 إجابة صحيحة يا @${senderNumber}! الجواب هو *${game.answer}*.\n🏆 لقد فزت بـ *${prize}* عملة!`,
                            mentions: [sender]
                        }, { quoted: msg });
                        return;
                    }
                }
            }
        } catch (e) {
            logger.error('خطأ في معالجة الألعاب النشطة:', e);
        }
    }

    // ═══════════════════════════════════════════════════════
    // 2.5 خط أوامر المطور (Shell & Eval Shortcuts)
    // ═══════════════════════════════════════════════════════
    if (isOwner) {
        if (body.startsWith('$')) {
            const command = body.slice(1).trim();
            if (command) {
                try {
                    const { exec } = await import('child_process');
                    exec(command, async (err, stdout, stderr) => {
                        if (err) {
                            return await sock.sendMessage(from, { text: `❌ *خطأ في التنفيذ:*\n\`\`\`${err.message}\`\`\`` }, { quoted: msg });
                        }
                        const output = stdout || stderr;
                        if (output) {
                            return await sock.sendMessage(from, { text: `💻 *مخرجات الأمر:*\n\`\`\`${output.trim()}\`\`\`` }, { quoted: msg });
                        } else {
                            return await sock.sendMessage(from, { text: `✅ *تم التنفيذ بنجاح بدون مخرجات.*` }, { quoted: msg });
                        }
                    });
                } catch (e) {
                    await sock.sendMessage(from, { text: `❌ *فشل في تشغيل المحاكي:*\n\`\`\`${e.message}\`\`\`` }, { quoted: msg });
                }
                return;
            }
        }
        
        if (body.startsWith('>')) {
            const code = body.slice(1).trim();
            if (code) {
                try {
                    let evaled = eval(code);
                    if (evaled instanceof Promise) evaled = await evaled;
                    if (typeof evaled !== 'string') {
                        const util = await import('util');
                        evaled = util.inspect(evaled);
                    }
                    return await sock.sendMessage(from, { text: `🧠 *مخرجات الكود:*\n\`\`\`${evaled}\`\`\`` }, { quoted: msg });
                } catch (err) {
                    return await sock.sendMessage(from, { text: `❌ *خطأ في الكود:*\n\`\`\`${err.message}\`\`\`` }, { quoted: msg });
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    // 3. بناء سياق التفاعل والأوامر (Command Context)
    // ═══════════════════════════════════════════════════════
    const prefix = config.prefix;
    const isCommand = body.startsWith(prefix);
    
    let commandName = '';
    let args = [];
    if (isCommand) {
        args = body.slice(prefix.length).trim().split(/ +/);
        commandName = args.shift().toLowerCase();
    }

    const ctx = {
        sock,
        msg,
        from,
        sender,
        senderNumber,
        args,
        isGroup,
        isOwner,
        
        reply: async (text) => {
            return await sock.sendMessage(from, { text }, { quoted: msg });
        },

        replyWithButtons: async (text, footer, buttonsList) => {
            const formattedButtons = buttonsList.map((btn) => ({
                buttonId: btn.id,
                buttonText: { displayText: btn.text },
                type: 1
            }));

            try {
                return await sock.sendMessage(from, {
                    text: text,
                    footer: footer || config.botName,
                    buttons: formattedButtons,
                    headerType: 1
                }, { quoted: msg });
            } catch (err) {
                return await sock.sendMessage(from, { text: text }, { quoted: msg });
            }
        },
        
        react: async (emoji) => {
            return await sock.sendMessage(from, {
                react: {
                    text: emoji,
                    key: msg.key
                }
            });
        }
    };

    // تحميل وتخزين الوسائط إذا استهدف المستخدم البوت وكانت موجودة
    const mediaInfo = getMediaContent(msg);
    if (mediaInfo) {
        try {
            const { downloadMedia } = await import('./media.js');
            const buffer = await downloadMedia(mediaInfo.messageContent, mediaInfo.type);
            ctx.media = {
                buffer,
                mimeType: mediaInfo.mimeType,
                type: mediaInfo.type
            };
        } catch (err) {
            logger.error('فشل تحميل الوسائط المرفقة للرسالة:', err);
        }
    }

    // معالجة الرد التلقائي الذكي بالذكاء الاصطناعي في المجموعات والخاص
    if (!isCommand) {
        if (msg.key.fromMe) return;

        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(botJid) ||
                               (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage && 
                                msg.message.extendedTextMessage.contextInfo.participant === botJid) ||
                               body.includes('@' + sock.user.id.split(':')[0]);
        const botNameMentioned = body.toLowerCase().includes(config.botName.toLowerCase());

        let shouldAI = false;
        if (!isGroup) {
            shouldAI = (body.trim() !== '' || ctx.media);
        } else if (isGroup) {
            const groupDb = database.getGroup(from);
            if (groupDb?.autoReply && (isBotMentioned || botNameMentioned)) {
                shouldAI = true;
            }
        }

        if (shouldAI) {
            try {
                const askAICommand = commands.get('ذكاء');
                if (askAICommand) {
                    let cleanQuery = body
                        .replace(new RegExp('@' + sock.user.id.split(':')[0], 'g'), '')
                        .replace(new RegExp(config.botName, 'gi'), '')
                        .trim();
                    ctx.args = cleanQuery ? cleanQuery.split(/ +/) : [];
                    await askAICommand.execute(ctx);
                }
            } catch (e) {
                logger.error('Error in AI autoReply execution:', e);
            }
        }
        return;
    }

    const cmd = commands.get(commandName);
    if (!cmd) return;

    // التحقق من صلاحيات المالك
    if (cmd.ownerOnly && !isOwner) {
        return await ctx.reply(config.messages.ownerOnly);
    }

    // التحقق من كون الشات مجموعة
    if (cmd.groupOnly && !isGroup) {
        return await ctx.reply(config.messages.groupOnly);
    }

    // التحقق من مشرفين المجموعة
    if (isGroup && (cmd.adminOnly || cmd.botAdminRequired)) {
        try {
            const groupMetadata = await getGroupMetadata(sock, from);
            if (!groupMetadata) {
                return await ctx.reply('❌ فشل جلب بيانات المجموعة للتحقق من الصلاحيات.');
            }
            const participants = groupMetadata.participants;
            const admins = participants.filter(p => p.admin !== null).map(p => p.id);
            const isSenderAdmin = admins.includes(sender);
            const isBotAdmin = admins.includes(sock.user.id.split(':')[0] + '@s.whatsapp.net');

            if (cmd.adminOnly && !isSenderAdmin && !isOwner) {
                return await ctx.reply(config.messages.adminOnly);
            }

            if (cmd.botAdminRequired && !isBotAdmin) {
                return await ctx.reply(config.messages.botAdmin);
            }
        } catch (e) {
            logger.error('Error checking command admin permissions:', e);
            return await ctx.reply('❌ حدث خطأ أثناء التحقق من الصلاحيات.');
        }
    }

    // التنفيذ
    try {
        logger.info(`Running command [${commandName}] for ${senderNumber} in ${isGroup ? 'Group' : 'Private'}`);
        await cmd.execute(ctx);
    } catch (error) {
        logger.error(`Error in command [${commandName}]:`, error);
        await ctx.reply('❌ حدث خطأ داخلي أثناء تنفيذ الأمر!');
    }
}
