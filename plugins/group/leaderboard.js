import { registerCommand } from '../../lib/handler.js';
import { database } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';

const showLeaderboard = async (ctx) => {
    await ctx.reply('📊 جاري حساب وحصر مستويات المتفاعلين في المجموعة...');

    try {
        const groupMetadata = await ctx.sock.groupMetadata(ctx.from);
        const participants = groupMetadata.participants.map(p => p.id);

        const leaderboard = [];
        for (const jid of participants) {
            const user = database.getUser(jid);
            leaderboard.push({
                jid,
                level: user.level || 1,
                xp: user.xp || 0
            });
        }

        leaderboard.sort((a, b) => {
            if (b.level !== a.level) return b.level - a.level;
            return b.xp - a.xp;
        });

        const topTen = leaderboard.slice(0, 10);
        let boardText = `🏆 *قائمة متفاعلي جروب: ${groupMetadata.subject}* 🏆\n\n`;

        const mentions = [];
        const medals = ['🥇', '🥈', '🥉'];
        topTen.forEach((user, idx) => {
            const userNum = user.jid.split('@')[0].split(':')[0];
            const medal = medals[idx] || `${idx + 1}.`;
            boardText += `${medal} @${userNum}\n   📊 المستوى: *${user.level}* | الخبرة: *${user.xp} XP*\n\n`;
            mentions.push(user.jid);
        });

        boardText += `💪 استمروا في التفاعل والدردشة لرفع مستوياتكم!`;

        await ctx.sock.sendMessage(ctx.from, {
            text: boardText,
            mentions
        }, { quoted: ctx.msg });

    } catch (e) {
        logger.error('خطأ في لوحة التفاعل:', e);
        await ctx.reply('❌ فشل حساب تفاعل المجموعة حالياً.');
    }
};

registerCommand('تفاعل', showLeaderboard, {
    description: 'عرض ترتيب الأعضاء الأكثر تفاعلاً ونشاطاً في المجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true
});

registerCommand('الترتيب', showLeaderboard, {
    description: 'عرض ترتيب الأعضاء الأكثر تفاعلاً ونشاطاً في المجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true
});

// 🏆 ترتيب الأغنى (محفظة)
registerCommand('الاغنى', async (ctx) => {
    try {
        const top = database.stats.topWallet(10);
        if (top.length === 0) {
            return ctx.reply('❌ لا يوجد بيانات بعد!');
        }

        let text = `💰 *أغنى 10 أشخاص في البوت* 💰\n\n`;
        const mentions = [];
        const medals = ['🥇', '🥈', '🥉'];
        top.forEach((u, idx) => {
            const num = u.jid.split('@')[0].split(':')[0];
            const medal = medals[idx] || `${idx + 1}.`;
            text += `${medal} @${num}\n   💵 *${u.wallet.toLocaleString()}* عملة\n\n`;
            mentions.push(u.jid);
        });

        await ctx.sock.sendMessage(ctx.from, { text, mentions }, { quoted: ctx.msg });
    } catch (e) {
        logger.error('خطأ في ترتيب الأغنى:', e);
        await ctx.reply('❌ فشل جلب الترتيب.');
    }
}, {
    description: 'عرض ترتيب أغنى المستخدمين في البوت',
    category: '🎮 ألعاب وتسلية'
});
