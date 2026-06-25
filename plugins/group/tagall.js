import { registerCommand } from '../../lib/handler.js';
import { cleanJid } from '../../lib/utils.js';

registerCommand('الكل', async (ctx) => {
    const groupMetadata = await ctx.sock.groupMetadata(ctx.from);
    const participants = groupMetadata.participants;
    
    let tagMessage = `📣 *منشن للجميع:*\n`;
    if (ctx.args.length > 0) {
        tagMessage += `📝 *الرسالة:* ${ctx.args.join(' ')}\n\n`;
    } else {
        tagMessage += `\n`;
    }

    const mentions = [];
    participants.forEach((p, index) => {
        const cleaned = cleanJid(p.id);
        tagMessage += `${index + 1}. @${cleaned.split('@')[0]}\n`;
        mentions.push(cleaned);
    });

    await ctx.sock.sendMessage(ctx.from, {
        text: tagMessage,
        mentions
    }, { quoted: ctx.msg });
}, {
    description: 'عمل منشن لجميع أعضاء المجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true
});
