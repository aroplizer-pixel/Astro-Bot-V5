import { registerCommand } from '../../lib/handler.js';
import { logger } from '../../lib/logger.js';
import axios from 'axios';

// 1. Blackbox AI Chat
const blackboxChat = async (ctx) => {
    const query = ctx.args.join(' ');
    if (!query) {
        return ctx.reply('❌ يرجى كتابة السؤال أو الرسالة التي تريد إرسالها لـ Blackbox!');
    }

    await ctx.reply('⏳ جاري الاتصال بـ Blackbox AI...');

    try {
        const url = `http://www.emam-api.web.id/home/sections/Ai/api/Blackbox/lumi?q=${encodeURIComponent(query)}`;
        const response = await axios.get(url, { timeout: 15000 });
        
        if (response.data && response.data.status && response.data.data) {
            await ctx.reply(`🧠 *Blackbox AI:* \n\n${response.data.data}`);
        } else {
            throw new Error(response.data?.message || 'استجابة غير صالحة من السيرفر');
        }
    } catch (e) {
        logger.error('فشل استدعاء Blackbox AI:', e.message);
        await ctx.reply('❌ فشل الاتصال بخادم Blackbox AI حالياً. يرجى المحاولة لاحقاً.');
    }
};

// 2. GPT Turbo Chat
const gptChat = async (ctx) => {
    const query = ctx.args.join(' ');
    if (!query) {
        return ctx.reply('❌ يرجى كتابة السؤال أو الرسالة التي تريد إرسالها لـ ChatGPT!');
    }

    await ctx.reply('⏳ جاري الاتصال بـ ChatGPT...');

    try {
        const url = `http://www.emam-api.web.id/home/sections/Ai/api/Gpt/turbo?q=${encodeURIComponent(query)}`;
        const response = await axios.get(url, { timeout: 15000 });
        
        if (response.data && response.data.status && response.data.message) {
            await ctx.reply(`🤖 *ChatGPT (Turbo):* \n\n${response.data.message}`);
        } else {
            throw new Error(response.data?.message || 'استجابة غير صالحة من السيرفر');
        }
    } catch (e) {
        logger.error('فشل استدعاء GPT Turbo:', e.message);
        await ctx.reply('❌ فشل الاتصال بخادم ChatGPT حالياً. يرجى المحاولة لاحقاً.');
    }
};

// 3. Custom Prompt AI
const customAiChat = async (ctx) => {
    const text = ctx.args.join(' ');
    if (!text) {
        return ctx.reply('❌ يرجى استخدام الصيغة التالية لتعريف البوت بسلوك معين:\n\n*.customai التوجيه (Prompt) | سؤالك*');
    }

    const parts = text.split('|');
    let prompt = "helpful assistant";
    let query = text;

    if (parts.length > 1) {
        prompt = parts[0].trim();
        query = parts[1].trim();
    } else {
        return ctx.reply('❌ يرجى فصل التوجيه عن سؤالك باستخدام علامة العمود العمودي | \nمثال: \n*.customai تقمص دور طبيب | رأسي يؤلمني*');
    }

    await ctx.reply('⏳ جاري تهيئة الذكاء الاصطناعي بالتعليمات المخصصة...');

    try {
        const url = `http://www.emam-api.web.id/home/sections/Ai/api/Ai/CustomPrompt?q=${encodeURIComponent(query)}&user=emam&prompt=${encodeURIComponent(prompt)}`;
        const response = await axios.get(url, { timeout: 15000 });
        
        if (response.data && response.data.status && response.data.data) {
            await ctx.reply(`👤 *Custom Prompt AI:* \n\n${response.data.data}`);
        } else {
            throw new Error(response.data?.message || 'استجابة غير صالحة من السيرفر');
        }
    } catch (e) {
        logger.error('فشل استدعاء Custom Prompt AI:', e.message);
        await ctx.reply('❌ فشل الاتصال بخادم Custom Prompt AI حالياً. يرجى المحاولة لاحقاً.');
    }
};

// 4. Flux premium Image Draw
const drawFlux = async (ctx) => {
    const prompt = ctx.args.join(' ');
    if (!prompt) {
        return ctx.reply('❌ يرجى كتابة وصف الصورة التي تريد رسمها باستخدام Flux!');
    }

    await ctx.reply('⏳ جاري رسم وتوليد صورتك بدقة فائقة عبر Flux...');

    try {
        const apiUrl = `http://www.emam-api.web.id/home/sections/Ai/api/imagen/flux?q=${encodeURIComponent(prompt)}`;
        const response = await axios.get(apiUrl, { timeout: 20000 });
        
        if (response.data && response.data.status && response.data.data && response.data.data.imageLink) {
            const imageLink = response.data.data.imageLink;
            
            const imgResponse = await axios.get(imageLink, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            const buffer = Buffer.from(imgResponse.data);

            await ctx.sock.sendMessage(ctx.from, {
                image: buffer,
                caption: `🎨 *رسم بواسطة Flux:* ${prompt}`
            }, { quoted: ctx.msg });
        } else {
            throw new Error(response.data?.message || 'رابط الصورة غير متوفر في الاستجابة');
        }
    } catch (e) {
        logger.error('فشل توليد الصورة بـ Flux:', e.message);
        await ctx.reply('❌ فشل خادم رسم صور Flux حالياً. يرجى المحاولة لاحقاً.');
    }
};

// 5. Writecream Image Draw
const drawWritecream = async (ctx) => {
    const prompt = ctx.args.join(' ');
    if (!prompt) {
        return ctx.reply('❌ يرجى كتابة وصف الصورة التي تريد رسمها باستخدام Writecream!');
    }

    await ctx.reply('⏳ جاري رسم وتوليد صورتك عبر Writecream...');

    try {
        const apiUrl = `http://www.emam-api.web.id/home/sections/Ai/api/imagen/writecream?q=${encodeURIComponent(prompt)}&size=512x512`;
        const response = await axios.get(apiUrl, { timeout: 20000 });
        
        if (response.data && response.data.status && response.data.data) {
            const imageLink = response.data.data;
            
            const imgResponse = await axios.get(imageLink, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            const buffer = Buffer.from(imgResponse.data);

            await ctx.sock.sendMessage(ctx.from, {
                image: buffer,
                caption: `🎨 *رسم بواسطة Writecream:* ${prompt}`
            }, { quoted: ctx.msg });
        } else {
            throw new Error(response.data?.message || 'رابط الصورة غير متوفر في الاستجابة');
        }
    } catch (e) {
        logger.error('فشل توليد الصورة بـ Writecream:', e.message);
        await ctx.reply('❌ فشل خادم رسم صور Writecream حالياً. يرجى المحاولة لاحقاً.');
    }
};

// 6. DeepAi Chat
const deepAiChat = async (ctx) => {
    const query = ctx.args.join(' ');
    if (!query) {
        return ctx.reply('❌ يرجى كتابة سؤالك للاتصال بـ DeepAI!');
    }

    await ctx.reply('⏳ جاري الاتصال بـ DeepAI...');

    try {
        const url = `http://www.emam-api.web.id/home/sections/Ai/api/DeepAI/chat?q=${encodeURIComponent(query)}`;
        const response = await axios.get(url, { timeout: 15000 });
        
        if (response.data && response.data.status && response.data.data) {
            await ctx.reply(`🧠 *DeepAI Chat:* \n\n${response.data.data}`);
        } else {
            throw new Error(response.data?.message || 'استجابة غير صالحة من السيرفر');
        }
    } catch (e) {
        logger.error('فشل استدعاء DeepAI chat:', e.message);
        await ctx.reply('❌ فشل الاتصال بخادم DeepAI حالياً. يرجى المحاولة لاحقاً.');
    }
};

// Register commands
registerCommand('بلاكبكس', blackboxChat, {
    description: 'تحدث مع الذكاء الاصطناعي Blackbox AI المطور للكود وحل المشاكل',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('blackbox', blackboxChat, {
    description: 'Chat with Blackbox AI for coding and general answers',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('جي_بي_تي', gptChat, {
    description: 'تحدث مع ChatGPT (Gpt-3.5 Turbo)',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('gpt', gptChat, {
    description: 'Chat with ChatGPT (GPT-3.5 Turbo)',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('توجيه_خاص', customAiChat, {
    description: 'تقمص شخصية أو توجيه البوت بسلوك معين والاستعلام منه',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('customai', customAiChat, {
    description: 'Instruct AI to adopt a specific persona/prompt and query it',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('فلوكس', drawFlux, {
    description: 'توليد ورسم صور عالية الدقة والجودة باستخدام محرك Flux',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('flux', drawFlux, {
    description: 'Generate high-quality premium images using Flux',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('كريم', drawWritecream, {
    description: 'رسم وتوليد صور سريعة باستخدام محرك Writecream',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('writecream', drawWritecream, {
    description: 'Generate images using Writecream',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('ديب_اي', deepAiChat, {
    description: 'تحدث مع خادم ذكاء اصطناعي بديل DeepAI',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('deepai', deepAiChat, {
    description: 'Chat with DeepAI chat model',
    category: '🧠 ذكاء اصطناعي'
});
