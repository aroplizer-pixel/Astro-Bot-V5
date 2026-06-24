import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';
import { prepareWAMessageMedia, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import fs from 'fs';
import os from 'os';

// دالة لتنظيف النصوص من الإيموجي للمقارنة والبحث
const cleanStr = str => str.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim().toLowerCase();

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
        // بيانات النظام للبروفايل الفاخر
        const uptime = getRuntime(process.uptime());
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const platform = os.platform();
        const totalCmds = commands.size;

        // تحميل صورة البانر الملكي
        let mediaMessage = await prepareWAMessageMedia(
            { image: fs.readFileSync('./assets/menu_banner.png') },
            { upload: ctx.sock.waUploadToServer }
        );

        // بناء قائمة الأقسام
        const sections = [
            {
                title: "📂 أقسام البوت التفاعلية",
                rows: [
                    { title: "🧠 قسم الذكاء الاصطناعي", description: "التحدث مع الذكاء الاصطناعي وتغيير الشخصيات", id: ".قسم ذكاء" },
                    { title: "🎮 قسم الألعاب والتسلية", description: "العمل، التعدين، السرقات والمبارزات الحية", id: ".قسم العاب" },
                    { title: "⬇️ قسم التحميلات", description: "تحميل مقاطع يوتيوب وتيك توك وإنستجرام وفيسبوك", id: ".قسم تحميل" },
                    { title: "🛠️ قسم الأدوات والإسلاميات", description: "الأذكار اليومية، الحاسبة، الطقس والـ QR Code", id: ".قسم ادوات" },
                    { title: "⚙️ القسم العام والمجموعات", description: "أوامر المشرفين وإعدادات حماية المجموعات", id: ".قسم عام" }
                ]
            }
        ];

        const listMessage = {
            title: "📂 عرض الأقسام الرئيسية",
            sections: sections
        };

        const bodyText = `
╭───「 👾 *${config.botName}* 」───╮
│ 👤 *المطور:* ${config.ownerName}
│ ⏱️ *وقت التشغيل:* ${uptime}
│ 💾 *الرام المستهلك:* ${ram} MB / ${totalRam} GB
│ 🖥️ *النظام:* ${platform}
│ 📊 *إجمالي الأوامر:* ${totalCmds} أمر مفعّل
╰─────────────────────╯

👋 *مرحباً بك يا بطل!*
📅 *التاريخ:* ${new Date().toLocaleDateString('ar-EG')}

👇 *استخدم زر الاختيار أدناه للتنقل وتصفح الأقسام:*`.trim();

        const cards = [
            {
                header: proto.Message.InteractiveMessage.Header.create({
                    title: `⚔️ لوحة تحكم ${config.botName}`,
                    subtitle: "المنيو الرئيسي",
                    hasMediaAttachment: true,
                    imageMessage: mediaMessage.imageMessage
                }),
                body: proto.Message.InteractiveMessage.Body.create({
                    text: bodyText
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                    text: `${config.botName} © 2026`
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: [
                        {
                            name: "single_select",
                            buttonParamsJson: JSON.stringify(listMessage)
                        },
                        {
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: "👑 المطور",
                                id: ".يومي"
                            })
                        }
                    ]
                })
            }
        ];

        const msg = generateWAMessageFromContent(ctx.from, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text: "القائمة الرئيسية" }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: config.botName }),
                        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({ cards: cards })
                    })
                }
            }
        }, { quoted: ctx.msg });

        await ctx.sock.relayMessage(ctx.from, msg.message, { messageId: msg.key.id });

    } catch (error) {
        console.error('❌ خطأ في إرسال المنيو الكاروسيل:', error.message);
        
        // التراجع النصي البسيط في حال الفشل المطلق
        let fallbackText = `⚔️ ─── [ لوحة تحكم ${config.botName} ] ─── ⚔️\n\n`;
        fallbackText += `اكتب الأوامر التالية يدوياً لتصفح الأقسام:\n`;
        fallbackText += `• *.قسم ذكاء*\n• *.قسم العاب*\n• *.قسم تحميل*\n• *.قسم ادوات*\n• *.قسم عام*`;
        await ctx.sock.sendMessage(ctx.from, { text: fallbackText }, { quoted: ctx.msg });
    }
}, {
    description: 'عرض قائمة الأوامر التفاعلية للبوت كقائمة كاروسيل وأزرار منسدلة',
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

    // تنظيف المدخل لتحديد الفئة المطلوبة وتجنب مشاكل الهمزة
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
    
    // تجميع كافة الأوامر المنتمية للفئات المستهدفة
    let categoryCmds = [];
    commands.forEach((cmd, name) => {
        if (targetCategories.includes(cmd.category)) {
            categoryCmds.push({ name, description: cmd.description });
        }
    });

    if (categoryCmds.length === 0) {
        return ctx.reply(`❌ لا توجد أوامر مسجلة في هذا القسم حالياً!`);
    }

    // بناء النص المفصل للأوامر
    let text = `🛡️ *أوامر قسم: [ ${targetCategories.join(' / ')} ]* 🛡️\n\n`;
    categoryCmds.forEach(c => {
        text += `• *${config.prefix}${c.name}* : ${c.description}\n`;
    });

    try {
        // تحميل صورة البانر
        let mediaMessage = await prepareWAMessageMedia(
            { image: fs.readFileSync('./assets/menu_banner.png') },
            { upload: ctx.sock.waUploadToServer }
        );

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
            rows.push({ title: "⬇️ قسم التحميلات", description: "الذهاب لقسم التحميلات والملصقات", id: ".قسم تحميل" });
        }
        if (targetKey !== 'ادوات') {
            rows.push({ title: "🛠️ قسم الأدوات والإسلاميات", description: "الذهاب لقسم الأدوات والأذكار", id: ".قسم ادوات" });
        }

        const listMessage = {
            title: "⚙️ خيارات التنقل والعودة",
            sections: [
                {
                    title: "ملاحة سريعة",
                    rows: rows
                }
            ]
        };

        const cards = [
            {
                header: proto.Message.InteractiveMessage.Header.create({
                    title: `📂 قسم ${targetCategories[0]}`,
                    subtitle: targetCategories[0],
                    hasMediaAttachment: true,
                    imageMessage: mediaMessage.imageMessage
                }),
                body: proto.Message.InteractiveMessage.Body.create({
                    text: text
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                    text: config.botName
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: [
                        {
                            name: "single_select",
                            buttonParamsJson: JSON.stringify(listMessage)
                        }
                    ]
                })
            }
        ];

        const msg = generateWAMessageFromContent(ctx.from, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text: `قسم ${targetCategories[0]}` }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: config.botName }),
                        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({ cards: cards })
                    })
                }
            }
        }, { quoted: ctx.msg });

        await ctx.sock.relayMessage(ctx.from, msg.message, { messageId: msg.key.id });

    } catch (err) {
        console.error("فشل إرسال قسم الكاروسيل المنسدل:", err);
        await ctx.sock.sendMessage(ctx.from, { text: text }, { quoted: ctx.msg });
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
