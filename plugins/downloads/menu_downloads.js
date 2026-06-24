import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';
import fs from 'fs';

registerCommand('قسم_تحميل', async (ctx) => {
    try {
        const targetCategories = ['⬇️ تحميلات', '🎨 وسائط وملصقات'];
        
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

        let text = `✨ ───『 *أوامر قسم التحميلات والوسائط ⬇️* 』─── ✨\n\n`;
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
        console.error("فشل إرسال قسم التحميلات:", err);
        await ctx.reply("❌ حدث خطأ أثناء عرض أوامر قسم التحميلات.");
    }
}, {
    description: 'عرض أوامر قسم التحميلات والوسائط بشكل نصي منسق',
    category: '⬇️ تحميلات'
});
