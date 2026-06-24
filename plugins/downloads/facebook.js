import { registerCommand } from '../../lib/handler.js';
import { downloadQueue } from '../../lib/queue.js';
import { transcodeToWhatsApp } from '../../lib/transcoder.js';
import { downloadMedia } from '../../lib/ytdlp.js';
import { logger } from '../../lib/logger.js';
import { formatDuration } from '../../lib/utils.js';

// 📘 تحميل من فيسبوك
const downloadFacebook = async (ctx) => {
    const url = ctx.args[0];
    if (!url) {
        return ctx.reply('❌ الرجاء إدخال رابط فيديو فيسبوك!');
    }

    await ctx.reply('⏳ جاري تحميل فيديو فيسبوك...');

    downloadQueue.add(async () => {
        try {
            logger.info(`تحميل فيديو فيسبوك: ${url}`);
            const res = await downloadMedia(url);

            if (!res.success || !res.buffer) {
                return ctx.reply(`❌ فشل تحميل فيديو فيسبوك. ${res.error || 'يرجى التحقق من الرابط.'}\n\n💡 *ملاحظة:* الفيديوهات الخاصة لا يمكن تحميلها.`);
            }

            const title = res.title || 'Facebook Video';

            await ctx.reply('🔄 جاري معالجة الفيديو ليكون متوافقاً مع واتساب...');

            let finalBuffer = res.buffer;
            try {
                finalBuffer = await transcodeToWhatsApp(res.buffer);
            } catch (transcodeErr) {
                logger.error('فشل ترميز فيديو فيسبوك:', transcodeErr.message);
            }

            await ctx.sock.sendMessage(ctx.from, {
                video: finalBuffer,
                caption: `📘 *${title}*\n⏱️ المدة: ${formatDuration(res.duration)}`,
                mimetype: 'video/mp4'
            }, { quoted: ctx.msg });

        } catch (e) {
            logger.error('خطأ في تحميل فيديو فيسبوك:', e);
            await ctx.reply('❌ حدث خطأ أثناء تحميل فيديو فيسبوك.');
        }
    });
};

registerCommand('فيسبوك', downloadFacebook, {
    description: 'تحميل الفيديوهات من فيسبوك',
    category: '⬇️ تحميلات'
});

registerCommand('facebook', downloadFacebook, {
    description: 'تحميل الفيديوهات من فيسبوك',
    category: '⬇️ تحميلات'
});
