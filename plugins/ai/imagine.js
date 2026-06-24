import { registerCommand } from '../../lib/handler.js';
import { logger } from '../../lib/logger.js';
import axios from 'axios';

const imagineAI = async (ctx) => {
    const prompt = ctx.args.join(' ');
    if (!prompt) {
        return ctx.reply('❌ يرجى كتابة وصف الصورة التي تريد رسمها بالذكاء الاصطناعي!');
    }

    await ctx.reply('⏳ جاري رسم وتوليد صورتك بالذكاء الاصطناعي...');

    try {
        // استخدام Pollinations AI كخادم توليد صور مجاني وسريع ومستقر بدون مفاتيح
        const seed = Math.floor(Math.random() * 1000000);
        const apiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;

        const response = await axios.get(apiUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            maxContentLength: 20 * 1024 * 1024
        });

        const imageBuffer = Buffer.from(response.data);

        await ctx.sock.sendMessage(ctx.from, {
            image: imageBuffer,
            caption: `🎨 *تخيل:* ${prompt}`
        }, { quoted: ctx.msg });

    } catch (e) {
        logger.error('فشل توليد الصورة بـ Pollinations AI:', e.message);
        await ctx.reply('❌ فشل خادم رسم الصور بالذكاء الاصطناعي حالياً. يرجى المحاولة لاحقاً.');
    }
};

registerCommand('رسم', imagineAI, {
    description: 'رسم وتوليد صورة بالذكاء الاصطناعي بناءً على وصفك (مجاني ومستقر)',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('تخيل', imagineAI, {
    description: 'رسم وتوليد صورة بالذكاء الاصطناعي بناءً على وصفك (مجاني ومستقر)',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('ارسم', imagineAI, {
    description: 'رسم وتوليد صورة بالذكاء الاصطناعي بناءً على وصفك (مجاني ومستقر)',
    category: '🧠 ذكاء اصطناعي'
});
