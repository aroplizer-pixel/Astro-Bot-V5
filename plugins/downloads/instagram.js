import { registerCommand } from '../../lib/handler.js';
import { downloadQueue } from '../../lib/queue.js';
import { transcodeToWhatsApp } from '../../lib/transcoder.js';
import { downloadMedia } from '../../lib/ytdlp.js';
import { logger } from '../../lib/logger.js';

const downloadInstagram = async (ctx) => {
    const url = ctx.args[0];
    if (!url) {
        return ctx.reply('❌ الرجاء إدخال رابط منشور إنستجرام!');
    }

    await ctx.reply('⏳ جاري تحميل محتوى إنستجرام...');

    downloadQueue.add(async () => {
        try {
            logger.info(`تحميل من إنستجرام: ${url}`);
            const res = await downloadMedia(url);

            if (!res.success || !res.buffer) {
                return ctx.reply(`❌ فشل تحميل محتوى إنستجرام. ${res.error || 'يرجى التحقق من الرابط.'}\n\n💡 *ملاحظة:* بعض المنشورات الخاصة لا يمكن تحميلها.`);
            }

            const title = res.title || 'Instagram Media';
            const ext = res.ext || 'mp4';

            // تحديد نوع الملف: فيديو أو صورة
            const isVideo = ['mp4', 'webm', 'mkv', 'avi', 'mov'].includes(ext.toLowerCase());

            if (isVideo) {
                await ctx.reply('🔄 جاري معالجة الفيديو ليكون متوافقاً مع واتساب...');

                let finalBuffer = res.buffer;
                try {
                    finalBuffer = await transcodeToWhatsApp(res.buffer);
                } catch (transcodeErr) {
                    logger.error('فشل ترميز فيديو إنستجرام:', transcodeErr.message);
                }

                await ctx.sock.sendMessage(ctx.from, {
                    video: finalBuffer,
                    caption: `📸 *${title}*`,
                    mimetype: 'video/mp4'
                }, { quoted: ctx.msg });
            } else {
                await ctx.sock.sendMessage(ctx.from, {
                    image: res.buffer,
                    caption: `📸 *${title}*`
                }, { quoted: ctx.msg });
            }

        } catch (e) {
            logger.error('خطأ في تحميل إنستجرام:', e);
            await ctx.reply('❌ حدث خطأ أثناء تحميل محتوى إنستجرام.');
        }
    });
};

registerCommand('انستا', downloadInstagram, {
    description: 'تحميل الصور والفيديوهات من إنستجرام',
    category: '⬇️ تحميلات'
});

registerCommand('انستجرام', downloadInstagram, {
    description: 'تحميل الصور والفيديوهات من إنستجرام',
    category: '⬇️ تحميلات'
});
