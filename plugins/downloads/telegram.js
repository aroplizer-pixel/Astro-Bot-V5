import { registerCommand } from '../../lib/handler.js';
import { downloadQueue } from '../../lib/queue.js';
import { transcodeToWhatsApp } from '../../lib/transcoder.js';
import { downloadMedia } from '../../lib/ytdlp.js';
import { logger } from '../../lib/logger.js';

// ✈️ تحميل من تيليجرام
const downloadTelegram = async (ctx) => {
    const url = ctx.args[0];
    if (!url) {
        return ctx.reply('❌ الرجاء إدخال رابط رسالة تيليجرام عامة!');
    }

    await ctx.reply('⏳ جاري تحميل المحتوى من تيليجرام...');

    downloadQueue.add(async () => {
        try {
            logger.info(`تحميل من تيليجرام: ${url}`);
            const res = await downloadMedia(url);

            if (!res.success || !res.buffer) {
                return ctx.reply(`❌ فشل تحميل المحتوى. ${res.error || 'يرجى التحقق من الرابط.'}\n\n💡 *ملاحظة:* يجب أن تكون الرسالة عامة.`);
            }

            const title = res.title || 'Telegram Media';
            const ext = (res.ext || 'mp4').toLowerCase();
            const isVideo = ['mp4', 'webm', 'mkv', 'avi', 'mov'].includes(ext);

            if (isVideo) {
                await ctx.reply('🔄 جاري معالجة الفيديو...');

                let finalBuffer = res.buffer;
                try {
                    finalBuffer = await transcodeToWhatsApp(res.buffer);
                } catch (transcodeErr) {
                    logger.error('فشل ترميز فيديو تيليجرام:', transcodeErr.message);
                }

                await ctx.sock.sendMessage(ctx.from, {
                    video: finalBuffer,
                    caption: `✈️ *${title}*`,
                    mimetype: 'video/mp4'
                }, { quoted: ctx.msg });
            } else {
                await ctx.sock.sendMessage(ctx.from, {
                    image: res.buffer,
                    caption: `✈️ *${title}*`
                }, { quoted: ctx.msg });
            }

        } catch (e) {
            logger.error('خطأ في تحميل تيليجرام:', e);
            await ctx.reply('❌ حدث خطأ أثناء تحميل المحتوى من تيليجرام.');
        }
    });
};

registerCommand('تيليجرام', downloadTelegram, {
    description: 'تحميل الفيديوهات والصور من رسائل تيليجرام العامة',
    category: '⬇️ تحميلات'
});

registerCommand('telegram', downloadTelegram, {
    description: 'تحميل الفيديوهات والصور من رسائل تيليجرام العامة',
    category: '⬇️ تحميلات'
});
