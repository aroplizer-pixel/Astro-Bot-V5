import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';
import fs from 'fs';

registerCommand('قسم_المالك', async (ctx) => {
    try {
        const targetCategories = ['👑 المالك'];
        
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

        let text = `✨ ───『 *أوامر قسم المالك والمطور 👑* 』─── ✨\n\n`;
        text += `👑 *صلاحيات التحكم الكاملة في البوت والبيانات (خاص بالمطورين):*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        categoryCmds.forEach(c => {
            text += `  ⚡ *${config.prefix}${c.name}*\n   └─ 📝 ${c.description}\n\n`;
        });
        text += `━━━━━━━━━━━━━━━━━━━━`;

        const buttons = [
            { text: '📊 إحصائيات', id: `${config.prefix}stats` },
            { text: '🔄 ريستارت', id: `${config.prefix}ريستارت` },
            { text: '💾 نسخة احتياطية', id: `${config.prefix}نسخ` },
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
        console.error("فشل إرسال قسم المالك:", err);
        await ctx.reply("❌ حدث خطأ أثناء عرض أوامر قسم المالك.");
    }
}, {
    description: 'عرض أوامر قسم المالك والمطور مع أزرار تفاعلية',
    category: '👑 المالك',
    ownerOnly: true
});
