import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';

registerCommand('قسم_تحميل', async (ctx) => {
    try {
        const targetCategories = ['⬇️ تحميلات'];
        
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

        let text = `✨ ───『 *أوامر قسم التحميلات ⬇️* 』─── ✨\n\n`;
        text += `📥 *حمّل من أي منصة بسهولة وسرعة!*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        categoryCmds.forEach(c => {
            text += `  ⚡ *${config.prefix}${c.name}*\n   └─ 📝 ${c.description}\n\n`;
        });
        text += `━━━━━━━━━━━━━━━━━━━━`;

        const buttons = [
            { text: '▶️ يوتيوب', id: `${config.prefix}يوتيوب` },
            { text: '🎵 تيك توك', id: `${config.prefix}تيك_توك` },
            { text: '📸 انستا', id: `${config.prefix}انستا` },
            { text: '🔙 القائمة الرئيسية', id: `${config.prefix}المنيو` }
        ];

        await ctx.sendButtons(text, `${config.botName} © 2026`, buttons);
    } catch (err) {
        console.error("فشل إرسال قسم التحميلات:", err);
        await ctx.reply("❌ حدث خطأ أثناء عرض أوامر قسم التحميلات.");
    }
}, {
    description: 'عرض أوامر قسم التحميلات مع أزرار تفاعلية',
    category: '⬇️ تحميلات'
});
