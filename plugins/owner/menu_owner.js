import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';
import { prepareWAMessageMedia, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import fs from 'fs';

registerCommand('قسم_المالك', async (ctx) => {
    try {
        const targetCategories = ['👑 المالك'];
        
        let categoryCmds = [];
        commands.forEach((cmd, name) => {
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

        let text = `✨ ───『 *أوامر قسم المالك والمطور 👑* 』─── ✨\n\n`;
        text += `🔹 *الأوامر والوظائف المتاحة في هذا القسم:* \n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        categoryCmds.forEach(c => {
            text += `🔹 *[ ${config.prefix}${c.name} ]*\n   └─ 📝 ${c.description}\n\n`;
        });
        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `🔙 أرسل *${config.prefix}المنيو* للرجوع للقائمة الرئيسية.`;

        let mediaMessage = null;
        try {
            if (fs.existsSync('./assets/menu_banner.png')) {
                mediaMessage = await prepareWAMessageMedia(
                    { image: fs.readFileSync('./assets/menu_banner.png') },
                    { upload: ctx.sock.waUploadToServer }
                );
            }
        } catch (e) {
            console.error("Failed to prepare menu banner:", e);
        }

        const rows = [
            { title: "🔙 العودة للمنيو الرئيسي", description: "الرجوع للوحة التحكم الرئيسية", id: ".المنيو" },
            { title: "🧠 قسم الذكاء الاصطناعي", description: "التحدث مع الذكاء الاصطناعي وتغيير الشخصيات والبحث", id: ".قسم_ذكاء" },
            { title: "🎮 قسم الألعاب والتسلية", description: "الألعاب، التعدين، العمل، المبارزات والترتيب", id: ".قسم_العاب" },
            { title: "⬇️ قسم التحميلات", description: "تحميل من يوتيوب، تيك توك، ومنصات الفيديو", id: ".قسم_تحميل" },
            { title: "🎨 قسم الوسائط والملصقات", description: "صناعة الملصقات والتعديل والتحويلات", id: ".قسم_وسائط" },
            { title: "🛠️ قسم الأدوات المساعدة", description: "الحاسبة والترجمة والطقس والـ QR", id: ".قسم_ادوات" },
            { title: "🕌 قسم الإسلاميات والقرآن", description: "الأذكار اليومية ومواقيت الصلاة والقراء", id: ".قسم_islam" },
            { title: "🛡️ قسم الجروبات والحماية", description: "أوامر حماية المجموعات ومنع الروابط والسبام", id: ".قسم_الجروبات" },
            { title: "⚙️ القسم العام والإعدادات", description: "الأوامر العامة ومعلومات البوت والتشغيل", id: ".قسم_عام" }
        ];

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
                title: `👑 قسم المالك والمطور`,
                subtitle: "قائمة الأوامر",
                hasMediaAttachment: true,
                imageMessage: mediaMessage.imageMessage
            });
        } else {
            interactiveMsg.header = proto.Message.InteractiveMessage.Header.create({
                title: `👑 قسم المالك والمطور`,
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
        console.error("فشل إرسال قسم المالك:", err);
        await ctx.reply("❌ حدث خطأ أثناء عرض أوامر قسم المالك.");
    }
}, {
    description: 'عرض أوامر قسم المالك والمطور بشكل نصي منسق',
    category: '👑 المالك'
});
