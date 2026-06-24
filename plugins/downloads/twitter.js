import { registerCommand } from '../../lib/handler.js';
import { downloadQueue } from '../../lib/queue.js';
import { transcodeToWhatsApp } from '../../lib/transcoder.js';
import { downloadMedia } from '../../lib/ytdlp.js';
import { logger } from '../../lib/logger.js';
import { formatDuration } from '../../lib/utils.js';

// 🐦 تحميل من تويتر / X
const downloadTwitter = async (ctx) => {
    const url = ctx.args[0];
    if (!url) {
        return ctx.reply('❌ الرجاء إدخال رابط تغريدة من تويتر/X!');
    }

    await ctx.reply('⏳ جاري تحميل الفيديو من تويتر...');

    downloadQueue.add(async () => {
        try {
            logger.info(`تحميل من تويتر: ${url}`);
            const res = await downloadMedia(url);

            if (!res.success || !res.buffer) {
                return ctx.reply(`❌ فشل تحميل الفيديو. ${res.error || 'يرجى التحقق من الرابط.'}`);
            }

            const title = res.title || 'Twitter Video';
            const isVideo = ['mp4', 'webm', 'mkv'].includes((res.ext || 'mp4').toLowerCase());

            if (isVideo) {
                await ctx.reply('🔄 جاري معالجة الفيديو ليكون متوافقاً مع واتساب...');

                let finalBuffer = res.buffer;
                try {
                    finalBuffer = await transcodeToWhatsApp(res.buffer);
                } catch (transcodeErr) {
                    logger.error('فشل ترميز فيديو تويتر:', transcodeErr.message);
                }

                await ctx.sock.sendMessage(ctx.from, {
                    video: finalBuffer,
                    caption: `🐦 *${title}*\n⏱️ ${formatDuration(res.duration)}`,
                    mimetype: 'video/mp4'
                }, { quoted: ctx.msg });
            } else {
                await ctx.sock.sendMessage(ctx.from, {
                    image: res.buffer,
                    caption: `🐦 *${title}*`
                }, { quoted: ctx.msg });
            }

        } catch (e) {
            logger.error('خطأ في تحميل تويتر:', e);
            await ctx.reply('❌ حدث خطأ أثناء تحميل الفيديو من تويتر.');
        }
    });
};

registerCommand('تويتر', downloadTwitter, {
    description: 'تحميل الفيديوهات والصور من تويتر/X',
    category: '⬇️ تحميلات'
});

registerCommand('twitter', downloadTwitter, {
    description: 'تحميل الفيديوهات والصور من تويتر/X',
    category: '⬇️ تحميلات'
});
