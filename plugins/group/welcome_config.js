import { registerCommand } from '../../lib/handler.js';
import { database } from '../../lib/db.js';
import config from '../../config.js';

// 👋 تفعيل/تعطيل الترحيب
registerCommand('ترحيب', async (ctx) => {
    const action = ctx.args[0];
    if (!action || (action !== 'تفعيل' && action !== 'تعطيل')) {
        const text = `👋 *إعدادات نظام الترحيب والمغادرة بالمجموعة*\n\nيرجى الاختيار لتفعيل أو تعطيل الترحيب بالأعضاء الجدد:`;
        const buttons = [
            { text: '✅ تفعيل الترحيب', id: `${config.prefix}ترحيب تفعيل` },
            { text: '❌ تعطيل الترحيب', id: `${config.prefix}ترحيب تعطيل` }
        ];
        return await ctx.sendButtons(text, `${config.botName} System`, buttons);
    }
    const isEnable = action === 'تفعيل';
    database.updateGroup(ctx.from, { welcome: isEnable });
    await ctx.reply(`👋 تم *${action}* نظام ترحيب الأعضاء الجدد بنجاح.`);
}, {
    description: 'تفعيل أو تعطيل ترحيب الأعضاء الجدد والوداع بالمجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true
});

// 📝 تخصيص رسالة الترحيب
registerCommand('رسالة_ترحيب', async (ctx) => {
    const text = ctx.args.join(' ').trim();
    if (!text) {
        let helpText = `📝 *تخصيص رسالة الترحيب بالأعضاء الجدد*\n\n`;
        helpText += `اكتب الأمر متبوعاً بالرسالة الجديدة.\n`;
        helpText += `مثال: \`.رسالة_ترحيب أهلاً بك يا @user في مجموعة @group! 🌸\`\n\n`;
        helpText += `💡 *المتغيرات المتاحة:* \n`;
        helpText += `  • *@user* : الإشارة (المنشن) للعضو الجديد\n`;
        helpText += `  • *@group* : اسم المجموعة الحالية`;
        return ctx.reply(helpText);
    }
    database.updateGroup(ctx.from, { welcomeMessage: text });
    await ctx.reply(`✅ تم تحديث رسالة الترحيب بنجاح إلى:\n\n${text}`);
}, {
    description: 'تخصيص رسالة ترحيب الأعضاء الجدد في المجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true
});

// 📝 تخصيص رسالة الوداع
registerCommand('رسالة_وداع', async (ctx) => {
    const text = ctx.args.join(' ').trim();
    if (!text) {
        let helpText = `📝 *تخصيص رسالة الوداع للأعضاء المغادرين*\n\n`;
        helpText += `اكتب الأمر متبوعاً بالرسالة الجديدة.\n`;
        helpText += `مثال: \`.رسالة_وداع غادرنا العضو @user.. نتمنى لك التوفيق 🥺\`\n\n`;
        helpText += `💡 *المتغيرات المتاحة:* \n`;
        helpText += `  • *@user* : اسم العضو المغادر\n`;
        helpText += `  • *@group* : اسم المجموعة الحالية`;
        return ctx.reply(helpText);
    }
    database.updateGroup(ctx.from, { goodbyeMessage: text });
    await ctx.reply(`✅ تم تحديث رسالة الوداع بنجاح إلى:\n\n${text}`);
}, {
    description: 'تخصيص رسالة وداع الأعضاء عند خروجهم من المجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true
});
