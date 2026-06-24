import { registerCommand } from '../../lib/handler.js';
import { database } from '../../lib/db.js';

// 🛡️ حماية الروابط
registerCommand('روابط', async (ctx) => {
    const action = ctx.args[0];
    if (!action || (action !== 'تفعيل' && action !== 'تعطيل')) {
        return ctx.reply('⚠️ الرجاء استخدام الأمر كالتالي:\n*.روابط تفعيل* (لتشغيل حماية الروابط)\n*.روابط تعطيل* (لإيقاف حماية الروابط)');
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
        return ctx.reply('⚠️ الرجاء استخدام الأمر كالتالي:\n*.سبام تفعيل* (لتشغيل حماية السبام والسيل المزعج)\n*.سبام تعطيل* (لإيقاف حماية السبام)');
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
        return ctx.reply('⚠️ الرجاء استخدام الأمر كالتالي:\n*.شتم تفعيل* (لتشغيل كشف وحذف الشتائم)\n*.شتم تعطيل* (لإيقاف كشف وحذف الشتائم)');
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
        return ctx.reply('⚠️ الرجاء استخدام الأمر كالتالي:\n*.مضاد_حذف تفعيل* (لتشغيل كشف الرسائل المحذوفة)\n*.مضاد_حذف تعطيل* (لإيقاف كشف المحذوفات)');
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
        return ctx.reply('⚠️ الرجاء استخدام الأمر كالتالي:\n*.تذكير تفعيل* (لتشغيل الأذكار التلقائية كل 30 دقيقة)\n*.تذكير تعطيل* (لإيقاف الأذكار التلقائية)');
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
