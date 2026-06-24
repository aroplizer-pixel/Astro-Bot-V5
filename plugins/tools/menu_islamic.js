import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';
import fs from 'fs';

registerCommand('قسم_islam', async (ctx) => {
    try {
        const targetCategories = ['🕌 إسلاميات'];
        
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

        let text = `✨ ───『 *أوامر قسم الإسلاميات والقرآن الكريم 🕌* 』─── ✨\n\n`;
        text += `🔹 *الأوامر والوظائف المتاحة في هذا القسم:* \n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        categoryCmds.forEach(c => {
            text += `🔹 *[ ${config.prefix}${c.name} ]*\n   └─ 📝 ${c.description}\n\n`;
        });
        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `🔙 أرسل *${config.prefix}المنيو* للرجوع للقائمة الرئيسية.`;

        const bannerPath = './assets/menu_banner.png';
        if (fs.existsSync(bannerPath)) {
            await ctx.sock.sendMessage(ctx.from, {
                image: fs.readFileSync(bannerPath),
                caption: text
            }, { quoted: ctx.msg });
        } else {
            await ctx.reply(text);
        }
    } catch (err) {
        console.error("فشل إرسال قسم الإسلاميات:", err);
        await ctx.reply("❌ حدث خطأ أثناء عرض أوامر قسم الإسلاميات.");
    }
}, {
    description: 'عرض أوامر قسم الإسلاميات والقرآن الكريم بشكل نصي منسق',
    category: '🕌 إسلاميات'
});
