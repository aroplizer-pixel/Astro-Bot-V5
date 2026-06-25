import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';
import fs from 'fs';

registerCommand('قسم_الجروبات', async (ctx) => {
    try {
        const targetCategories = ['🛡️ حماية وإدارة'];
        
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

        let text = `✨ ───『 *أوامر قسم الحماية والجروبات 🛡️* 』─── ✨\n\n`;
        text += `🛡️ *أقوى أنظمة حماية المجموعات والتحكم الإداري الكامل:*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        categoryCmds.forEach(c => {
            text += `  ⚡ *${config.prefix}${c.name}*\n   └─ 📝 ${c.description}\n\n`;
        });
        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `👇 *افتح القائمة المنسدلة بالأسفل لاختيار الأوامر مباشرة:*`;

        const sections = [
            {
                title: "🛡️ أنظمة التفعيل والحماية",
                rows: [
                    { title: "لوحة التحكم الحماية ⚙️", description: "عرض حالة جميع الحمايات بالكامل", id: `${config.prefix}حالة_الحماية` },
                    { title: "مضاد الروابط 🔗", description: "تفعيل/تعطيل حماية المجموعة من الروابط", id: `${config.prefix}روابط` },
                    { title: "مضاد السبام 💬", description: "تفعيل/تعطيل حماية المجموعة من السبام", id: `${config.prefix}سبام` },
                    { title: "مضاد الشتائم 🤬", description: "تفعيل/تعطيل فلترة وحذف الشتائم", id: `${config.prefix}شتم` },
                    { title: "مضاد الحذف 🗑️", description: "تفعيل/تعطيل كشف الرسائل المحذوفة", id: `${config.prefix}مضاد_حذف` },
                    { title: "تذكير تلقائي 🕌", description: "تفعيل/تعطيل التذكير بالأذكار والآيات", id: `${config.prefix}تذكير` }
                ]
            },
            {
                title: "👥 إدارة المجموعات والأعضاء",
                rows: [
                    { title: "طرد عضو ❌", description: "طرد عضو من المجموعة", id: `${config.prefix}طرد` },
                    { title: "ترقية لمشرف 👑", description: "ترقية عضو إلى مشرف", id: `${config.prefix}ترقية` },
                    { title: "تنزيل لعضو 👤", description: "تنزيل مشرف لعضو عادي", id: `${config.prefix}تنزيل` },
                    { title: "منشن للجميع 📣", description: "عمل منشن لجميع أعضاء المجموعة", id: `${config.prefix}الكل` },
                    { title: "إعلان مخفي 📢", description: "إرسال إعلان مع إشارة مخفية للجميع", id: `${config.prefix}اعلان` },
                    { title: "معلومات المجموعة 📋", description: "عرض تفاصيل المجموعة الحالية", id: `${config.prefix}معلومات_الجروب` },
                    { title: "رابط المجموعة 🔗", description: "جلب رابط دعوة المجموعة", id: `${config.prefix}رابط_الجروب` },
                    { title: "تجديد الرابط 🔄", description: "تجديد رابط دعوة المجموعة", id: `${config.prefix}تجديد_الرابط` },
                    { title: "قفل المجموعة 🔒", description: "قفل المجموعة لإرسال المشرفين فقط", id: `${config.prefix}قفل_الجروب` },
                    { title: "فتح المجموعة 🔓", description: "فتح المجموعة لإرسال الجميع", id: `${config.prefix}فتح_الجروب` }
                ]
            },
            {
                title: "🔙 العودة",
                rows: [
                    { title: "المنيو الرئيسي 🔙", description: "الرجوع لقائمة الأقسام الرئيسية", id: `${config.prefix}المنيو` }
                ]
            }
        ];

        await ctx.sendList(text, `${config.botName} © 2026`, "🛠️ قائمة أدوات الإدارة", sections);
    } catch (err) {
        console.error("فشل إرسال قائمة الجروبات:", err);
        await ctx.reply("❌ حدث خطأ أثناء عرض أوامر المجموعات.");
    }
}, {
    description: 'عرض قائمة تفاعلية لأوامر حماية وإدارة المجموعات',
    category: '🛡️ حماية وإدارة'
});
