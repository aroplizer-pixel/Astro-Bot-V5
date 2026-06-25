import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';

registerCommand('قسم_العاب', async (ctx) => {
    try {
        const targetCategories = ['🎮 ألعاب وتسلية'];
        
        let categoryCmds = [];
        commands.forEach((cmd, name) => {
            if (name === 'help' || name === 'الاوامر') return;
            if (targetCategories.includes(cmd.category)) {
                categoryCmds.push({ name, description: cmd.description });
            }
        });

        if (categoryCmds.length === 0) {
            return ctx.reply(`❌ لا توجد أوامر مسجلة في هذا القسم حالياً!`);
        }

        let text = `✨ ───『 *أوامر قسم الألعاب والتسلية 🎮* 』─── ✨\n\n`;
        text += `⚔️ *خض المعارك واكسب الذهب وارفع مستواك!*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        categoryCmds.forEach(c => {
            text += `  ⚡ *${config.prefix}${c.name}*\n   └─ 📝 ${c.description}\n\n`;
        });
        text += `━━━━━━━━━━━━━━━━━━━━`;

        const buttons = [
            { text: '👤 بروفايلي', id: `${config.prefix}بروفايل` },
            { text: '🎁 الهدية اليومية', id: `${config.prefix}يومي` },
            { text: '⛏️ تعدين', id: `${config.prefix}تعدين` },
            { text: '🔙 القائمة الرئيسية', id: `${config.prefix}المنيو` }
        ];

        await ctx.sendButtons(text, `${config.botName} © 2026`, buttons);
    } catch (err) {
        console.error("فشل إرسال قسم الألعاب:", err);
        await ctx.reply("❌ حدث خطأ أثناء عرض أوامر قسم الألعاب.");
    }
}, {
    description: 'عرض أوامر قسم الألعاب والتسلية مع أزرار تفاعلية',
    category: '🎮 ألعاب وتسلية'
});
