import { registerCommand } from '../../lib/handler.js';
import { logger } from '../../lib/logger.js';
import axios from 'axios';

// 🌐 ترجمة فورية للنصوص
registerCommand('ترجم', async (ctx) => {
    const text = ctx.args.join(' ');
    if (!text) {
        return ctx.reply('❌ يرجى إدخال النص الذي تريد ترجمته!\n\n💡 *استخدام:*\n• *.ترجم hello world* → يترجم للعربية تلقائياً\n• *.ترجم en:hello* → يترجم لإنجليزي\n• *.ترجم fr:bonjour* → يترجم لفرنسي');
    }

    // كشف اللغة الهدف إن حُددت (مثال: en:text  أو  fr:text)
    let targetLang = 'ar';
    let textToTranslate = text;

    if (/^[a-z]{2}:/i.test(text)) {
        const colonIdx = text.indexOf(':');
        targetLang = text.slice(0, colonIdx).toLowerCase();
        textToTranslate = text.slice(colonIdx + 1).trim();
    }

    if (!textToTranslate) {
        return ctx.reply('❌ النص فارغ بعد تحديد اللغة!');
    }

    await ctx.reply('🌐 جاري الترجمة...');

    try {
        // استخدام Google Translate غير الرسمي (مجاني بدون مفتاح)
        const url = 'https://translate.googleapis.com/translate_a/single';
        const response = await axios.get(url, {
            params: {
                client: 'gtx',
                sl: 'auto',
                tl: targetLang,
                dt: 't',
                q: textToTranslate
            },
            timeout: 10000
        });

        if (response.data && response.data[0]) {
            // البيانات تأتي كمصفوفة متداخلة - نجمّع الترجمة
            const translated = response.data[0]
                .map(chunk => chunk[0])
                .join('');

            const detectedLang = response.data[2] || 'غير معروف';

            await ctx.reply(
                `🌐 *الترجمة:*\n\n${translated}\n\n` +
                `📊 اللغة المصدر: *${detectedLang}*\n` +
                `🎯 اللغة الهدف: *${targetLang}*`
            );
        } else {
            await ctx.reply('❌ لم يتم العثور على ترجمة.');
        }
    } catch (e) {
        logger.error('خطأ في الترجمة:', e.message);
        await ctx.reply('❌ حدث خطأ أثناء الترجمة. تحقق من اللغة المحددة أو حاول لاحقاً.');
    }
}, {
    description: 'ترجمة فورية للنصوص لأي لغة (افتراضياً للعربية)',
    category: '🧠 ذكاء اصطناعي'
});
