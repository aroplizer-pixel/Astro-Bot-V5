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

// ⚔️ أمر المنيو الرئيسي
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

        // بناء قائمة الأقسام لزر الخيارات
        const sections = [
            {
                title: "📂 أقسام البوت التفاعلية",
                rows: [
                    { title: "🧠 قسم الذكاء الاصطناعي", description: "التحدث مع الذكاء الاصطناعي وتغيير الشخصيات والبحث", id: ".قسم ذكاء" },
                    { title: "🎮 قسم الألعاب والتسلية", description: "الألعاب، التعدين، العمل، المبارزات والترتيب", id: ".قسم العاب" },
                    { title: "⬇️ قسم التحميلات والوسائط", description: "تحميل من يوتيوب، تيك توك، وملصقات وصور", id: ".قسم تحميل" },
                    { title: "🛠️ قسم الأدوات والإسلاميات", description: "الأذكار والقرآن، الحاسبة، الطقس والترجمة", id: ".قسم ادوات" },
                    { title: "⚙️ القسم العام والإدارة", description: "أوامر المجموعات والمشرفين وحماية الجروب", id: ".قسم عام" }
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
        fallbackText += `🧠 *.قسم ذكاء* : الذكاء الاصطناعي\n`;
        fallbackText += `🎮 *.قسم العاب* : الألعاب والتسلية\n`;
        fallbackText += `⬇️ *.قسم تحميل* : تحميل الوسائط والملفات\n`;
        fallbackText += `🛠️ *.قسم ادوات* : الأدوات والإسلاميات\n`;
        fallbackText += `⚙️ *.قسم عام* : الإعدادات والمجموعات\n\n`;
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

// ⚔️ أمر تصفح قسم محدد
const CATEGORY_MAPPING = {
    'ذكاء': ['🧠 ذكاء اصطناعي'],
    'العاب': ['🎮 ألعاب وتسلية'],
    'تحميل': ['⬇️ تحميلات', '🎨 وسائط وملصقات'],
    'ادوات': ['🛠️ أدوات', '🕌 إسلاميات'],
    'عام': ['⚙️ عام', '🛡️ حماية وإدارة', '👑 المالك']
};

registerCommand('قسم', async (ctx) => {
    const query = ctx.args[0]?.trim();
    if (!query) {
        return ctx.reply('❌ يرجى تحديد القسم لعرض أوامره!\nمثال: *.قسم ذكاء*');
    }

    let targetKey = null;
    const cleanedQuery = query.toLowerCase();
    
    if (cleanedQuery.includes('ذكاء')) targetKey = 'ذكاء';
    else if (cleanedQuery.includes('العاب') || cleanedQuery.includes('ألعاب')) targetKey = 'العاب';
    else if (cleanedQuery.includes('تحميل')) targetKey = 'تحميل';
    else if (cleanedQuery.includes('ادوات') || cleanedQuery.includes('أدوات')) targetKey = 'ادوات';
    else if (cleanedQuery.includes('عام')) targetKey = 'عام';

    if (!targetKey || !CATEGORY_MAPPING[targetKey]) {
        return ctx.reply(`❌ لم يتم العثور على قسم مطابق لـ: "${query}"!`);
    }

    const targetCategories = CATEGORY_MAPPING[targetKey];
    
    let categoryCmds = [];
    commands.forEach((cmd, name) => {
        // تجنب تكرار الأوامر الرديفة في قائمة الفئة
        if (name === 'help' || name === 'الاوامر' || name === 'ردتلقائي' || name === 'بحث' || name === 'بوت') {
            return;
        }
        if (targetCategories.includes(cmd.category)) {
            categoryCmds.push({ name, description: cmd.description });
        }
    });

    if (categoryCmds.length === 0) {
        return ctx.reply(`❌ لا توجد أوامر مسجلة في هذا القسم حالياً!`);
    }

    let text = `✨ ───『 *أوامر قسم: ${targetCategories.join(' / ')}* 』─── ✨\n\n`;
    text += `🔹 *الأوامر والوظائف المتاحة في هذا القسم:* \n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    categoryCmds.forEach(c => {
        text += `🔹 *${config.prefix}${c.name}*\n   └─ 📝 ${c.description}\n\n`;
    });
    text += `━━━━━━━━━━━━━━━━━━━━`;

    try {
        let mediaMessage = null;
        try {
            if (fs.existsSync('./assets/menu_banner.png')) {
                mediaMessage = await prepareWAMessageMedia(
                    { image: fs.readFileSync('./assets/menu_banner.png') },
                    { upload: ctx.sock.waUploadToServer }
                );
            }
        } catch (e) {
            console.error("Failed to prepare section banner:", e);
        }

        const rows = [
            { title: "🔙 العودة للمنيو الرئيسي", description: "الرجوع للوحة التحكم الرئيسية", id: ".المنيو" }
        ];

        // خيارات ملاحة سريعة بين الأقسام الرئيسية الأخرى
        if (targetKey !== 'العاب') {
            rows.push({ title: "🎮 قسم الألعاب والتسلية", description: "الذهاب لقسم الألعاب والـ RPG", id: ".قسم العاب" });
        }
        if (targetKey !== 'ذكاء') {
            rows.push({ title: "🧠 قسم الذكاء الاصطناعي", description: "الذهاب لقسم الذكاء والـ AI", id: ".قسم ذكاء" });
        }
        if (targetKey !== 'تحميل') {
            rows.push({ title: "⬇️ قسم التحميلات والوسائط", description: "الذهاب لقسم التحميلات والملصقات", id: ".قسم تحميل" });
        }
        if (targetKey !== 'ادوات') {
            rows.push({ title: "🛠️ قسم الأدوات والإسلاميات", description: "الذهاب لقسم الأدوات والأذكار", id: ".قسم ادوات" });
        }
        if (targetKey !== 'عام') {
            rows.push({ title: "⚙️ القسم العام والإدارة", description: "الذهاب للقسم العام والمجموعات", id: ".قسم عام" });
        }

        const listMessage = {
            title: "⚙️ خيارات التنقل والعودة",
            sections: [
                {
                    title: "ملاحة سريعة بين الأقسام",
                    rows: rows
                }
            ]
        };

        const interactiveMsg = {
            body: proto.Message.InteractiveMessage.Body.create({ text: text }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: config.botName }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                    {
                        name: "single_select",
                        buttonParamsJson: JSON.stringify(listMessage)
                    }
                ]
            })
        };

        if (mediaMessage?.imageMessage) {
            interactiveMsg.header = proto.Message.InteractiveMessage.Header.create({
                title: `📂 قسم ${targetCategories[0]}`,
                subtitle: targetCategories[0],
                hasMediaAttachment: true,
                imageMessage: mediaMessage.imageMessage
            });
        } else {
            interactiveMsg.header = proto.Message.InteractiveMessage.Header.create({
                title: `📂 قسم ${targetCategories[0]}`,
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

    } catch (err) {
        console.error("فشل إرسال قسم القوائم التفاعلية:", err);
        const bannerPath = './assets/menu_banner.png';
        if (fs.existsSync(bannerPath)) {
            await ctx.sock.sendMessage(ctx.from, {
                image: fs.readFileSync(bannerPath),
                caption: text
            }, { quoted: ctx.msg });
        } else {
            await ctx.reply(text);
        }
    }
}, {
    description: 'عرض أوامر قسم معين بالقوائم التفاعلية',
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
