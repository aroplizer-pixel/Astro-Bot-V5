import { registerCommand } from '../../lib/handler.js';
import { database } from '../../lib/db.js';
import config from '../../config.js';

registerCommand('حالة_الحماية', async (ctx) => {
    try {
        const group = database.getGroup(ctx.from);
        
        const antiLinkStatus = group.antiLink ? '✅ مفعّل' : '❌ معطّل';
        const antiSpamStatus = group.antiSpam ? '✅ مفعّل' : '❌ معطّل';
        const antiBadwordsStatus = group.antiBadwords ? '✅ مفعّل' : '❌ معطّل';
        const antiDeleteStatus = group.antiDelete ? '✅ مفعّل' : '❌ معطّل';
        const autoAdhkarStatus = group.autoAdhkar ? '✅ مفعّل' : '❌ معطّل';

        let text = `🛡️ *لوحة تحكم أنظمة الحماية والإشراف* 🛡️\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        text += `🔗 *مضاد الروابط:*  ${antiLinkStatus}\n`;
        text += `💬 *مضاد السبام:*   ${antiSpamStatus}\n`;
        text += `🤬 *مضاد الشتم:*    ${antiBadwordsStatus}\n`;
        text += `🗑 *مضاد الحذف:*   ${antiDeleteStatus}\n`;
        text += `🕌 *تذكير تلقائي:*   ${autoAdhkarStatus}\n\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `👇 *اضغط على زر الإعدادات بالأسفل لتغيير حالة أي نظام حماية فوراً:*`;

        const sections = [
            {
                title: "⚙️ إعدادات الحماية والتفعيل",
                rows: [
                    { title: "تعديل فلتر الروابط 🔗", description: `تغيير الحالة الحالية (${antiLinkStatus})`, id: `${config.prefix}روابط` },
                    { title: "تعديل نظام السبام 💬", description: `تغيير الحالة الحالية (${antiSpamStatus})`, id: `${config.prefix}سبام` },
                    { title: "تعديل فلتر الشتائم 🤬", description: `تغيير الحالة الحالية (${antiBadwordsStatus})`, id: `${config.prefix}شتم` },
                    { title: "تعديل مضاد الحذف 🗑️", description: `تغيير الحالة الحالية (${antiDeleteStatus})`, id: `${config.prefix}مضاد_حذف` },
                    { title: "تعديل التذكير التلقائي 🕌", description: `تغيير الحالة الحالية (${autoAdhkarStatus})`, id: `${config.prefix}تذكير` }
                ]
            },
            {
                title: "🔙 العودة",
                rows: [
                    { title: "المنيو الرئيسي 🔙", description: "الرجوع لقائمة الأقسام الرئيسية", id: `${config.prefix}المنيو` }
                ]
            }
        ];

        await ctx.sendList(text, `${config.botName} Security Panel`, "⚙️ إعدادات الحماية", sections);
    } catch (err) {
        console.error("فشل عرض حالة الحماية:", err);
        await ctx.reply("❌ حدث خطأ أثناء عرض حالة أنظمة الحماية.");
    }
}, {
    description: 'عرض لوحة التحكم وحالة أنظمة الحماية وتفعيلها/تعطيلها بالمجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true
});
