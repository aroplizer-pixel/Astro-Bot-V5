import { registerCommand } from '../../lib/handler.js';
import { downloadQueue } from '../../lib/queue.js';
import { transcodeToWhatsApp } from '../../lib/transcoder.js';
import { downloadMedia } from '../../lib/ytdlp.js';
import { logger } from '../../lib/logger.js';
import { formatDuration } from '../../lib/utils.js';

const downloadTikTok = async (ctx) => {
    const url = ctx.args[0];
    if (!url) {
        return ctx.reply('❌ الرجاء إدخال رابط فيديو تيك توك!');
    }

    await ctx.reply('⏳ جاري تحميل فيديو تيك توك...');

    downloadQueue.add(async () => {
        try {
            logger.info(`تحميل فيديو تيك توك: ${url}`);
            const res = await downloadMedia(url);

            if (!res.success || !res.buffer) {
                return ctx.reply(`❌ فشل تحميل فيديو تيك توك. ${res.error || 'يرجى التحقق من الرابط.'}`);
            }

            const title = res.title || 'TikTok Video';

            await ctx.reply('🔄 جاري معالجة الفيديو ليكون متوافقاً مع واتساب...');

            let finalBuffer = res.buffer;
            try {
                finalBuffer = await transcodeToWhatsApp(res.buffer);
            } catch (transcodeErr) {
                logger.error('فشل ترميز فيديو تيك توك، إرسال الأصل:', transcodeErr.message);
            }

            await ctx.sock.sendMessage(ctx.from, {
                video: finalBuffer,
                caption: `🎬 *${title}*\n⏱️ ${formatDuration(res.duration)}`,
                mimetype: 'video/mp4'
            }, { quoted: ctx.msg });

        } catch (e) {
            logger.error('خطأ في تحميل تيك توك:', e);
            await ctx.reply('❌ حدث خطأ أثناء تحميل فيديو تيك توك.');
        }
    });
};

registerCommand('تيكتوك', downloadTikTok, {
    description: 'تحميل فيديوهات تيك توك بدون علامة مائية',
    category: '⬇️ تحميلات'
});

registerCommand('تيك', downloadTikTok, {
    description: 'تحميل فيديوهات تيك توك بدون علامة مائية',
    category: '⬇️ تحميلات'
});
