import { registerCommand, commands } from '../../lib/handler.js';
import config from '../../config.js';
import fs from 'fs';
import os from 'os';

// دالة لتحويل وقت التشغيل
function getRuntime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const parts = [];
    if (h > 0) parts.push(`${h} ساعة`);
    if (m > 0) parts.push(`${m} دقيقة`);
    if (s > 0 || parts.length === 0) parts.push(`${s} ثانية`);
    return parts.join(' و ');
}

// ⚔️ أمر المنيو الرئيسي
registerCommand('المنيو', async (ctx) => {
    await ctx.react('📋');

    try {
        const uptime = getRuntime(process.uptime());
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const platform = os.platform();
        const totalCmds = commands.size;

        // تجميع الأوامر حسب الفئة
        const categories = {};
        commands.forEach((cmd, name) => {
            // تجنب تكرار الأوامر المتطابقة أو البديلة في الواجهة لتوفير المساحة
            if (name === 'help' || name === 'الاوامر' || name === 'ردتلقائي' || name === 'بحث' || name === 'بوت') {
                return;
            }
            const cat = cmd.category || '⚙️ عام';
            if (!categories[cat]) {
                categories[cat] = [];
            }
            categories[cat].push({ name, description: cmd.description });
        });

        // بناء النص الجمالي الفاخر
        let menuText = `✨ ───『 *${config.botName.toUpperCase()}* 』─── ✨\n\n`;
        menuText += `👤 *المالِك:* ${config.ownerName}\n`;
        menuText += `⏱️ *التشغيل:* ${uptime}\n`;
        menuText += `💾 *الذاكرة:* ${ram} MB / ${totalRam} GB\n`;
        menuText += `📊 *الأوامر:* ${totalCmds} أمر نشط\n`;
        menuText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        menuText += `👋 *أهلاً بك يا بطل في قائمة أوامر البوت:*\n\n`;

        for (const [catName, cmds] of Object.entries(categories)) {
            menuText += `*${catName}* 📂\n`;
            menuText += `━━━━━━━━━━━━━━━━━━━━\n`;
            cmds.forEach(c => {
                menuText += `🔹 *${config.prefix}${c.name}*\n   └─ 📝 ${c.description}\n`;
            });
            menuText += `\n`;
        }

        menuText += `━━━━━━━━━━━━━━━━━━━━\n`;
        menuText += `✨ *${config.botName} © 2026*`;

        const bannerPath = './assets/menu_banner.png';
        if (fs.existsSync(bannerPath)) {
            await ctx.sock.sendMessage(ctx.from, {
                image: fs.readFileSync(bannerPath),
                caption: menuText
            }, { quoted: ctx.msg });
        } else {
            await ctx.reply(menuText);
        }

    } catch (error) {
        console.error('❌ خطأ في إرسال المنيو:', error.message);
        await ctx.reply('❌ حدث خطأ أثناء عرض قائمة الأوامر.');
    }
}, {
    description: 'عرض قائمة الأوامر الكاملة للبوت بشكل جمالي منسق ومتوافق مع جميع الأجهزة',
    category: '⚙️ عام'
});

// ⚔️ أمر تصفح قسم محدد
const CATEGORY_MAPPING = {
    'ذكاء': ['🧠 ذكاء اصطناعي'],
    'العاب': ['🎮 ألعاب وتسلية'],
    'تحميل': ['⬇️ تحميلات', '🎨 وسائط وملصقات'],
    'ادوات': ['🛠️ أدوات', '🕌 إسلاميات'],
    'عام': ['⚙️ عام', '🛡️ حماية وإدارة', '👑 المالك']
};

registerCommand('قسم', async (ctx) => {
    const query = ctx.args[0]?.trim();
    if (!query) {
        return ctx.reply('❌ يرجى تحديد القسم لعرض أوامره!\nمثال: *.قسم ذكاء*');
    }

    let targetKey = null;
    const cleanedQuery = query.toLowerCase();
    
    if (cleanedQuery.includes('ذكاء')) targetKey = 'ذكاء';
    else if (cleanedQuery.includes('العاب') || cleanedQuery.includes('ألعاب')) targetKey = 'العاب';
    else if (cleanedQuery.includes('تحميل')) targetKey = 'تحميل';
    else if (cleanedQuery.includes('ادوات') || cleanedQuery.includes('أدوات')) targetKey = 'ادوات';
    else if (cleanedQuery.includes('عام')) targetKey = 'عام';

    if (!targetKey || !CATEGORY_MAPPING[targetKey]) {
        return ctx.reply(`❌ لم يتم العثور على قسم مطابق لـ: "${query}"!`);
    }

    const targetCategories = CATEGORY_MAPPING[targetKey];
    
    let categoryCmds = [];
    commands.forEach((cmd, name) => {
        if (targetCategories.includes(cmd.category)) {
            categoryCmds.push({ name, description: cmd.description });
        }
    });

    if (categoryCmds.length === 0) {
        return ctx.reply(`❌ لا توجد أوامر مسجلة في هذا القسم حالياً!`);
    }

    let text = `✨ ───『 *أوامر قسم: ${targetCategories.join(' / ')}* 』─── ✨\n\n`;
    text += `🔹 *الأوامر والوظائف المتاحة في هذا القسم:* \n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    categoryCmds.forEach(c => {
        text += `🔹 *${config.prefix}${c.name}*\n   └─ 📝 ${c.description}\n\n`;
    });
    text += `━━━━━━━━━━━━━━━━━━━━`;

    try {
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
        console.error("فشل إرسال القسم:", err);
        await ctx.reply(text);
    }
}, {
    description: 'عرض أوامر قسم معين بشكل جمالي متوافق مع جميع الأجهزة',
    category: '⚙️ عام'
});

// اختصارات الأوامر للتوافق
registerCommand('الاوامر', async (ctx) => {
    const cmd = commands.get('المنيو');
    if (cmd) await cmd.execute(ctx);
}, {
    description: 'عرض قائمة الأوامر',
    category: '⚙️ عام'
});

registerCommand('help', async (ctx) => {
    const cmd = commands.get('المنيو');
    if (cmd) await cmd.execute(ctx);
}, {
    description: 'Help command (English)',
    category: '⚙️ عام'
});
