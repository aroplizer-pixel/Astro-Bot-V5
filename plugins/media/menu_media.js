import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';

registerCommand('قسم_وسائط', async (ctx) => {
    try {
        const targetCategories = ['🎨 وسائط'];
        
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

        let text = `✨ ───『 *أوامر قسم الوسائط والملصقات 🎨* 』─── ✨\n\n`;
        text += `🖼️ *حوّل صورك وفيديوهاتك لملصقات وأكثر!*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        categoryCmds.forEach(c => {
            text += `  ⚡ *${config.prefix}${c.name}*\n   └─ 📝 ${c.description}\n\n`;
        });
        text += `━━━━━━━━━━━━━━━━━━━━`;

        const buttons = [
            { text: '🖼️ ملصق', id: `${config.prefix}ملصق` },
            { text: '🎙️ صوت', id: `${config.prefix}صوت` },
            { text: '🔙 القائمة الرئيسية', id: `${config.prefix}المنيو` }
        ];

        await ctx.sendButtons(text, `${config.botName} © 2026`, buttons);
    } catch (err) {
        console.error("فشل إرسال قسم الوسائط:", err);
        await ctx.reply("❌ حدث خطأ أثناء عرض أوامر قسم الوسائط.");
    }
}, {
    description: 'عرض أوامر قسم الوسائط والملصقات مع أزرار تفاعلية',
    category: '🎨 وسائط'
});
