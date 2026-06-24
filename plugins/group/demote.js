import { registerCommand } from '../../lib/handler.js';

registerCommand('تنزيل', async (ctx) => {
    let target = ctx.args[0] ? (ctx.args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net') : null;
    
    if (ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (ctx.msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.participant;
    }

    if (!target) {
        return ctx.reply('❌ يرجى الإشارة للعضو (منشن) أو الرد على رسالته لتنزيله!');
    }

    try {
        await ctx.sock.groupParticipantsUpdate(ctx.from, [target], 'demote');
        await ctx.reply(`✅ تم تنزيل العضو بنجاح إلى رتبة عضو عادي.`);
    } catch (e) {
        console.error(e);
        await ctx.reply('❌ فشل تنزيل العضو، تأكد من صلاحيات البوت.');
    }
}, {
    description: 'تنزيل رتبة مشرف إلى عضو عادي',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true
});
