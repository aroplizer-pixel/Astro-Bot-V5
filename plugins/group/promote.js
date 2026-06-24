import { registerCommand } from '../../lib/handler.js';

registerCommand('ترقية', async (ctx) => {
    let target = ctx.args[0] ? (ctx.args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net') : null;
    
    if (ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (ctx.msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.participant;
    }

    if (target) {
        target = target.split('@')[0].split(':')[0] + '@s.whatsapp.net';
    }

    if (!target) {
        return ctx.reply('❌ يرجى الإشارة للعضو (منشن) أو الرد على رسالته لترقيته!');
    }

    try {
        await ctx.sock.groupParticipantsUpdate(ctx.from, [target], 'promote');
        await ctx.reply(`✅ تم ترقية العضو بنجاح إلى مشرف.`);
    } catch (e) {
        console.error(e);
        await ctx.reply('❌ فشل ترقية العضو، تأكد من صلاحيات البوت.');
    }
}, {
    description: 'ترقية عضو ليصبح مشرفاً',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true
});
