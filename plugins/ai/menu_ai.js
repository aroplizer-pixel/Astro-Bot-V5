import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';

registerCommand('قسم_ذكاء', async (ctx) => {
    try {
        const targetCategories = ['🧠 ذكاء اصطناعي'];
        
        let categoryCmds = [];
        commands.forEach((cmd, name) => {
            if (name === 'help' || name === 'الاوامر' || name === 'ردتلقائي' || name === 'بحث' || name === 'بوت') {
                return;
            }
            if (targetCategories.includes(cmd.category)) {
                categoryCmds.push({ name, description: cmd.description });
            }
        });

        if (categoryCmds.length === 0) {
            return ctx.reply(`❌ لا توجد أوامر مسجلة في هذا القسم حالياً!`);
        }

        let text = `✨ ───『 *أوامر قسم الذكاء الاصطناعي 🧠* 』─── ✨\n\n`;
        text += `🤖 *تحدث مع الذكاء الاصطناعي واستمتع بقدرات خارقة!*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        categoryCmds.forEach(c => {
            text += `  ⚡ *${config.prefix}${c.name}*\n   └─ 📝 ${c.description}\n\n`;
        });
        text += `━━━━━━━━━━━━━━━━━━━━`;

        const buttons = [
            { text: '🧠 تحدث مع الذكاء', id: `${config.prefix}ذكاء` },
            { text: '🌐 ترجمة نص', id: `${config.prefix}ترجمة` },
            { text: '📝 تلخيص', id: `${config.prefix}تلخيص` },
            { text: '🔙 القائمة الرئيسية', id: `${config.prefix}المنيو` }
        ];

        await ctx.sendButtons(text, `${config.botName} © 2026`, buttons);
    } catch (err) {
        console.error("فشل إرسال قسم الذكاء:", err);
        await ctx.reply("❌ حدث خطأ أثناء عرض أوامر قسم الذكاء.");
    }
}, {
    description: 'عرض أوامر قسم الذكاء الاصطناعي مع أزرار تفاعلية',
    category: '🧠 ذكاء اصطناعي'
});
