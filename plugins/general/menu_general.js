import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';
import fs from 'fs';

registerCommand('قسم_عام', async (ctx) => {
    try {
        const targetCategories = ['⚙️ عام'];
        
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

        let text = `✨ ───『 *أوامر القسم العام والإعدادات ⚙️* 』─── ✨\n\n`;
        text += `⚙️ *الأوامر الأساسية والإعدادات وفحص حالة الاتصال:* \n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        categoryCmds.forEach(c => {
            text += `  ⚡ *${config.prefix}${c.name}*\n   └─ 📝 ${c.description}\n\n`;
        });
        text += `━━━━━━━━━━━━━━━━━━━━`;

        const buttons = [
            { text: '⚡ سرعة البوت', id: `${config.prefix}بنج` },
            { text: '🔙 القائمة الرئيسية', id: `${config.prefix}المنيو` }
        ];

        const bannerPath = './assets/menu_banner.png';
        if (fs.existsSync(bannerPath)) {
            const imageBuffer = fs.readFileSync(bannerPath);
            await ctx.sendButtonsWithImage(imageBuffer, text, `${config.botName} © 2026`, buttons);
        } else {
            await ctx.sendButtons(text, `${config.botName} © 2026`, buttons);
        }
    } catch (err) {
        console.error("فشل إرسال قسم العام:", err);
        await ctx.reply("❌ حدث خطأ أثناء عرض أوامر قسم العام.");
    }
}, {
    description: 'عرض أوامر القسم العام والإعدادات العامة مع أزرار تفاعلية',
    category: '⚙️ عام'
});
