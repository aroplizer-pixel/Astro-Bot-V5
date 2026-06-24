import { registerCommand } from '../../lib/handler.js';
import { logger } from '../../lib/logger.js';
import config from '../../config.js';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 📝 تلخيص النصوص الطويلة
async function summarizeText(text, lang = 'ar') {
    const hasGemini = config.geminiApiKey && config.geminiApiKey.trim() !== '';

    if (hasGemini) {
        try {
            const genAI = new GoogleGenerativeAI(config.geminiApiKey);
            const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest'];
            for (const modelName of models) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const prompt = lang === 'ar'
                        ? `لخّص النص التالي بشكل مختصر وواضح باللغة العربية في نقاط رئيسية:\n\n${text}`
                        : `Summarize the following text clearly and concisely:\n\n${text}`;
                    const result = await model.generateContent(prompt);
                    const summary = result.response.text();
                    if (summary) return summary;
                } catch (modelErr) {
                    logger.error(`فشل موديل ${modelName}:`, modelErr.message);
                }
            }
        } catch (e) {
            logger.error('خطأ في Gemini:', e.message);
        }
    }

    // Fallback: تلخيص تقريبي بالاعتماد على أول وأهم الجمل
    const sentences = text.split(/[.!?؟。\n]+/).filter(s => s.trim().length > 30);
    if (sentences.length === 0) return text.slice(0, 500);

    // أخذ أول 3-5 جمل كملخص تقريبي
    const summaryCount = Math.min(5, Math.ceil(sentences.length / 3));
    return sentences.slice(0, summaryCount).join('. ') + '.';
}

registerCommand('لخص', async (ctx) => {
    let text = ctx.args.join(' ');

    // إن لم يوجد نص، نحاول قراءة رسالة مقتبسة
    if (!text) {
        const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted?.conversation) text = quoted.conversation;
        else if (quoted?.extendedTextMessage?.text) text = quoted.extendedTextMessage.text;
    }

    if (!text || text.length < 50) {
        return ctx.reply('❌ النص قصير جداً للتلخيص!\n\n💡 *استخدام:*\n• *.لخص [النص الطويل]*\n• أو رُد على رسالة طويلة بـ *.لخص*');
    }

    await ctx.reply('📝 جاري تلخيص النص...');

    try {
        const summary = await summarizeText(text);
        const originalWords = text.split(/\s+/).length;
        const summaryWords = summary.split(/\s+/).length;
        const reduction = Math.round((1 - summaryWords / originalWords) * 100);

        await ctx.reply(
            `📝 *ملخص النص:*\n\n${summary}\n\n` +
            `📊 الأصل: ${originalWords} كلمة → الملخّص: ${summaryWords} كلمة (${reduction}% اختصار)`
        );
    } catch (e) {
        logger.error('خطأ في التلخيص:', e);
        await ctx.reply('❌ حدث خطأ أثناء التلخيص.');
    }
}, {
    description: 'تلخيص النصوص الطويلة بشكل مختصر وواضح',
    category: '🧠 ذكاء اصطناعي'
});
