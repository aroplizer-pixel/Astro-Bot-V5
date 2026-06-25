import { registerCommand } from '../../lib/handler.js';
import { database } from '../../lib/db.js';
import config from '../../config.js';

// 🛡️ حماية الروابط
registerCommand('روابط', async (ctx) => {
    const action = ctx.args[0];
    if (!action || (action !== 'تفعيل' && action !== 'تعطيل')) {
        const text = `🛡️ *إعدادات حماية الروابط (Anti-Link)*\n\nيرجى الاختيار من الأزرار بالأسفل لتفعيل أو تعطيل حماية الروابط في المجموعة:`;
        const buttons = [
            { text: '✅ تفعيل الحماية', id: `${config.prefix}روابط تفعيل` },
            { text: '❌ تعطيل الحماية', id: `${config.prefix}روابط تعطيل` }
        ];
        return await ctx.sendButtons(text, `${config.botName} Protection`, buttons);
    }
    const isEnable = action === 'تفعيل';
    database.updateGroup(ctx.from, { antiLink: isEnable });
    await ctx.reply(`🛡️ تم *${action}* نظام حماية الروابط بنجاح في هذه المجموعة.`);
}, {
    description: 'تفعيل أو تعطيل حماية الروابط (Anti-Link) في المجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true
});

// 🛡️ حماية السبام
registerCommand('سبام', async (ctx) => {
    const action = ctx.args[0];
    if (!action || (action !== 'تفعيل' && action !== 'تعطيل')) {
        const text = `🛡️ *إعدادات حماية السبام والرسائل المزعجة (Anti-Spam)*\n\nيرجى الاختيار لتفعيل أو تعطيل حماية المجموعات من السبام:`;
        const buttons = [
            { text: '✅ تفعيل الحماية', id: `${config.prefix}سبام تفعيل` },
            { text: '❌ تعطيل الحماية', id: `${config.prefix}سبام تعطيل` }
        ];
        return await ctx.sendButtons(text, `${config.botName} Protection`, buttons);
    }
    const isEnable = action === 'تفعيل';
    database.updateGroup(ctx.from, { antiSpam: isEnable });
    await ctx.reply(`🛡️ تم *${action}* نظام حماية السبام بنجاح في هذه المجموعة.`);
}, {
    description: 'تفعيل أو تعطيل حماية المجموعات من السبام والرسائل السريعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true
});

// 🛡️ حماية الشتائم والكلمات البذيئة
registerCommand('شتم', async (ctx) => {
    const action = ctx.args[0];
    if (!action || (action !== 'تفعيل' && action !== 'تعطيل')) {
        const text = `🛡️ *إعدادات تصفية الشتائم والكلمات البذيئة (Anti-Badword)*\n\nيرجى الاختيار لتفعيل أو تعطيل تصفية وحذف الكلمات البذيئة في المجموعة:`;
        const buttons = [
            { text: '✅ تفعيل الفلترة', id: `${config.prefix}شتم تفعيل` },
            { text: '❌ تعطيل الفلترة', id: `${config.prefix}شتم تعطيل` }
        ];
        return await ctx.sendButtons(text, `${config.botName} Protection`, buttons);
    }
    const isEnable = action === 'تفعيل';
    database.updateGroup(ctx.from, { antiBadwords: isEnable });
    await ctx.reply(`🛡️ تم *${action}* نظام حماية المجموعة من الشتائم بنجاح.`);
}, {
    description: 'تفعيل أو تعطيل فلترة وحذف الشتائم من المجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true
});

// 🛡️ مضاد حذف الرسائل (Anti-Delete)
registerCommand('مضاد_حذف', async (ctx) => {
    const action = ctx.args[0];
    if (!action || (action !== 'تفعيل' && action !== 'تعطيل')) {
        const text = `🛡️ *إعدادات مضاد حذف الرسائل (Anti-Delete)*\n\nيرجى الاختيار لتفعيل أو تعطيل إرسال الرسائل بعد حذفها:`;
        const buttons = [
            { text: '✅ تفعيل المضاد', id: `${config.prefix}مضاد_حذف تفعيل` },
            { text: '❌ تعطيل المضاد', id: `${config.prefix}مضاد_حذف تعطيل` }
        ];
        return await ctx.sendButtons(text, `${config.botName} Protection`, buttons);
    }
    const isEnable = action === 'تفعيل';
    database.updateGroup(ctx.from, { antiDelete: isEnable });
    await ctx.reply(`🛡️ تم *${action}* نظام مضاد حذف الرسائل بنجاح في هذه المجموعة.`);
}, {
    description: 'تفعيل أو تعطيل إعادة إرسال الرسائل المحذوفة بالمجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true
});

// 📅 التذكير بالأذكار والقرآن (Auto-Adhkar)
registerCommand('تذكير', async (ctx) => {
    const action = ctx.args[0];
    if (!action || (action !== 'تفعيل' && action !== 'تعطيل')) {
        const text = `🕌 *إعدادات التذكير التلقائي بالأذكار والآيات*\n\nيرجى الاختيار لتفعيل أو تعطيل التذكير التلقائي كل 30 دقيقة:`;
        const buttons = [
            { text: '✅ تفعيل التذكير', id: `${config.prefix}تذكير تفعيل` },
            { text: '❌ تعطيل التذكير', id: `${config.prefix}تذكير تعطيل` }
        ];
        return await ctx.sendButtons(text, `${config.botName} Protection`, buttons);
    }
    const isEnable = action === 'تفعيل';
    database.updateGroup(ctx.from, { autoAdhkar: isEnable });
    await ctx.reply(`🛡️ تم *${action}* نظام التذكير التلقائي بالأذكار والآيات القرآنية بنجاح.`);
}, {
    description: 'تفعيل أو تعطيل التذكير التلقائي بالأذكار الإسلامية بالمجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true
});
