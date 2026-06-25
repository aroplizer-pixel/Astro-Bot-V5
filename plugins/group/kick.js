import { registerCommand } from '../../lib/handler.js';
import { cleanJid } from '../../lib/utils.js';

registerCommand('طرد', async (ctx) => {
    let target = ctx.args[0] ? (ctx.args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net') : null;
    
    // استخراج المستهدف من المنشن أو الاقتباس
    if (ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (ctx.msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.participant;
    }

    if (target) {
        target = cleanJid(target);
    }

    if (!target) {
        return ctx.reply('❌ يرجى الإشارة للعضو (منشن) أو الرد على رسالته لطردة!');
    }

    try {
        await ctx.sock.groupParticipantsUpdate(ctx.from, [target], 'remove');
        await ctx.reply(`✅ تم طرد العضو بنجاح.`);
    } catch (e) {
        console.error(e);
        await ctx.reply('❌ فشل طرد العضو، تأكد من صلاحيات البوت.');
    }
}, {
    description: 'طرد عضو من المجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true
});
