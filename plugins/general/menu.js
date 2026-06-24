import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';
import { prepareWAMessageMedia, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import fs from 'fs';
import os from 'os';

// دالة لتحويل وقت التشغيل
function getRuntime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const parts = [];
    if (h > 0) parts.push(`${h} ساعة`);
    if (m > 0) parts.push(`${m} دقيقة`);
    if (s > 0 || parts.length === 0) parts.push(`${s} ثانية`);
    return parts.join(' و ');
}

// ⚔️ أمر المنيو الرئيسي الأزرار
registerCommand('المنيو', async (ctx) => {
    await ctx.react('📋');

    try {
        const uptime = getRuntime(process.uptime());
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const platform = os.platform();
        const totalCmds = commands.size;

        // تحميل صورة البانر الملكي
        let mediaMessage = null;
        try {
            if (fs.existsSync('./assets/menu_banner.png')) {
                mediaMessage = await prepareWAMessageMedia(
                    { image: fs.readFileSync('./assets/menu_banner.png') },
                    { upload: ctx.sock.waUploadToServer }
                );
            }
        } catch (e) {
            console.error("Failed to prepare menu banner media:", e);
        }

        // بناء قائمة الأقسام لزر الخيارات مع توجيهها للأوامر الموزعة الجديدة
        const sections = [
            {
                title: "📂 أقسام البوت التفاعلية",
                rows: [
                    { title: "🧠 قسم الذكاء الاصطناعي", description: "التحدث مع الذكاء الاصطناعي وتغيير الشخصيات والبحث", id: ".قسم_ذكاء" },
                    { title: "🎮 قسم الألعاب والتسلية", description: "الألعاب، التعدين، العمل، المبارزات والترتيب", id: ".قسم_العاب" },
                    { title: "⬇️ قسم التحميلات والوسائط", description: "تحميل من يوتيوب، تيك توك، وملصقات وصور", id: ".قسم_تحميل" },
                    { title: "🛠️ قسم الأدوات والإسلاميات", description: "الأذكار والقرآن، الحاسبة، الطقس والترجمة", id: ".قسم_ادوات" },
                    { title: "⚙️ القسم العام والإدارة", description: "أوامر المجموعات والمشرفين وحماية الجروب", id: ".قسم_عام" }
                ]
            }
        ];

        const listMessage = {
            title: "📂 عرض الأقسام الرئيسية",
            sections: sections
        };

        const buttons = [
            {
                name: "single_select",
                buttonParamsJson: JSON.stringify(listMessage)
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "🎁 الهدية اليومية",
                    id: ".يومي"
                })
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "⚡ سرعة البوت",
                    id: ".بنج"
                })
            }
        ];

        // بناء النص الجمالي الفاخر
        let bodyText = `✨ ───『 *${config.botName.toUpperCase()}* 』─── ✨\n\n`;
        bodyText += `👤 *المالِك:* ${config.ownerName}\n`;
        bodyText += `⏱️ *التشغيل:* ${uptime}\n`;
        bodyText += `💾 *الذاكرة:* ${ram} MB / ${totalRam} GB\n`;
        bodyText += `🖥️ *المنصة:* ${platform}\n`;
        bodyText += `📊 *الأوامر:* ${totalCmds} أمر نشط\n`;
        bodyText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        bodyText += `👋 *أهلاً بك يا بطل في لوحة التحكم الخاصة بالبوت!*\n`;
        bodyText += `📅 *التاريخ:* ${new Date().toLocaleDateString('ar-EG')}\n\n`;
        bodyText += `🔹 *تصفّح أقسام الأوامر الآن عبر زر القائمة التفاعلية أدناه:*`;

        const interactiveMsg = {
            body: proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: `${config.botName} © 2026` }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: buttons
            })
        };

        if (mediaMessage?.imageMessage) {
            interactiveMsg.header = proto.Message.InteractiveMessage.Header.create({
                title: `⚔️ لوحة تحكم ${config.botName}`,
                subtitle: "المنيو الرئيسي",
                hasMediaAttachment: true,
                imageMessage: mediaMessage.imageMessage
            });
        } else {
            interactiveMsg.header = proto.Message.InteractiveMessage.Header.create({
                title: `⚔️ لوحة تحكم ${config.botName}`,
                hasMediaAttachment: false
            });
        }

        const msg = generateWAMessageFromContent(ctx.from, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create(interactiveMsg)
                }
            }
        }, { quoted: ctx.msg });

        await ctx.sock.relayMessage(ctx.from, msg.message, { messageId: msg.key.id });

    } catch (error) {
        console.error('❌ خطأ في إرسال المنيو التفاعلي:', error.message);
        
        let fallbackText = `✨ ───『 *${config.botName.toUpperCase()}* 』─── ✨\n\n`;
        fallbackText += `👋 *أهلاً بك يا بطل! اكتب الأوامر التالية لتصفح الأقسام:*\n\n`;
        fallbackText += `🧠 *.قسم_ذكاء* : الذكاء الاصطناعي\n`;
        fallbackText += `🎮 *.قسم_العاب* : الألعاب والتسلية\n`;
        fallbackText += `⬇️ *.قسم_تحميل* : تحميل الوسائط والملفات\n`;
        fallbackText += `🛠️ *.قسم_ادوات* : الأدوات والإسلاميات\n`;
        fallbackText += `⚙️ *.قسم_عام* : الإعدادات والمجموعات\n\n`;
        fallbackText += `━━━━━━━━━━━━━━━━━━━━`;

        const bannerPath = './assets/menu_banner.png';
        if (fs.existsSync(bannerPath)) {
            await ctx.sock.sendMessage(ctx.from, {
                image: fs.readFileSync(bannerPath),
                caption: fallbackText
            }, { quoted: ctx.msg });
        } else {
            await ctx.reply(fallbackText);
        }
    }
}, {
    description: 'عرض قائمة الأوامر التفاعلية للبوت كقائمة وأزرار منسدلة',
    category: '⚙️ عام'
});

// ⚔️ أمر التوجيه والتوافق للأقسام (Router)
registerCommand('قسم', async (ctx) => {
    const query = ctx.args[0]?.trim();
    if (!query) {
        return ctx.reply('❌ يرجى تحديد القسم لعرض أوامره!\nمثال: *.قسم ذكاء*');
    }

    const cleanedQuery = query.toLowerCase();
    let cmdToExecute = null;
    if (cleanedQuery.includes('ذكاء')) cmdToExecute = 'قسم_ذكاء';
    else if (cleanedQuery.includes('العاب') || cleanedQuery.includes('ألعاب')) cmdToExecute = 'قسم_العاب';
    else if (cleanedQuery.includes('تحميل')) cmdToExecute = 'قسم_تحميل';
    else if (cleanedQuery.includes('ادوات') || cleanedQuery.includes('أدوات')) cmdToExecute = 'قسم_ادوات';
    else if (cleanedQuery.includes('عام')) cmdToExecute = 'قسم_عام';

    if (cmdToExecute) {
        const cmd = commands.get(cmdToExecute);
        if (cmd) {
            await cmd.execute(ctx);
            return;
        }
    }
    return ctx.reply(`❌ لم يتم العثور على قسم مطابق لـ: "${query}"!`);
}, {
    description: 'عرض أوامر قسم معين بشكل نصي منسق (توجيه متوافق)',
    category: '⚙️ عام'
});

// اختصارات الأوامر للتوافق
registerCommand('الاوامر', async (ctx) => {
    const cmd = commands.get('المنيو');
    if (cmd) await cmd.execute(ctx);
}, {
    description: 'عرض قائمة الأوامر',
    category: '⚙️ عام'
});

registerCommand('help', async (ctx) => {
    const cmd = commands.get('المنيو');
    if (cmd) await cmd.execute(ctx);
}, {
    description: 'Help command (English)',
    category: '⚙️ عام'
});
