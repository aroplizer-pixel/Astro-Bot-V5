import { registerCommand } from '../../lib/handler.js';

registerCommand('اعلان', async (ctx) => {
    const groupMetadata = await ctx.sock.groupMetadata(ctx.from);
    const participants = groupMetadata.participants;
    
    const messageText = ctx.args.join(' ');
    if (!messageText) {
        return ctx.reply('❌ الرجاء كتابة نص الإعلان أو الرسالة!');
    }

    const mentions = participants.map(p => p.id);

    await ctx.sock.sendMessage(ctx.from, {
        text: messageText,
        mentions
    });
}, {
    description: 'إرسال إعلان مع إشارة مخفية لجميع الأعضاء',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true
});
