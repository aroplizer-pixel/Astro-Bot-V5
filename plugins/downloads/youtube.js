import { registerCommand } from '../../lib/handler.js';
import { downloadQueue } from '../../lib/queue.js';
import { transcodeToWhatsApp } from '../../lib/transcoder.js';
import { downloadMedia, getInfo } from '../../lib/ytdlp.js';
import { logger } from '../../lib/logger.js';
import { formatDuration } from '../../lib/utils.js';
import config from '../../config.js';
import ytSearch from 'yt-search';

// 🎬 تحميل فيديو من اليوتيوب
registerCommand('فيديو', async (ctx) => {
    const query = ctx.args.join(' ');
    if (!query) {
        return ctx.reply('❌ يرجى إدخال اسم الفيديو أو رابط اليوتيوب!');
    }

    await ctx.reply('⏳ تم إضافة طلبك إلى طابور التحميل، جاري معالجة طلبك قريباً...');

    downloadQueue.add(async () => {
        try {
            let videoUrl = query;
            let title = 'YouTube Video';

            if (!/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(query)) {
                const search = await ytSearch(query);
                if (!search.videos || search.videos.length === 0) {
                    return ctx.reply('❌ لم يتم العثور على أي نتائج للبحث!');
                }
                const video = search.videos[0];
                videoUrl = video.url;
                title = video.title;
            }

            // فحص المدة قبل التحميل لتوفير الوقت والموارد
            const info = await getInfo(videoUrl);
            const duration = info?.duration || 0;
            if (duration > config.limits.maxVideoDuration) {
                return ctx.reply(`❌ الفيديو طويل جداً (${formatDuration(duration)})! الحد الأقصى ${formatDuration(config.limits.maxVideoDuration)}.`);
            }

            logger.info(`تحميل فيديو يوتيوب: ${videoUrl}`);
            const res = await downloadMedia(videoUrl);

            if (!res.success || !res.buffer) {
                return ctx.reply(`❌ فشل تحميل الفيديو من يوتيوب. ${res.error || ''}`);
            }

            const videoTitle = res.title || info?.title || title;

            await ctx.reply('🔄 جاري معالجة الفيديو وترميزه ليكون متوافقاً مع واتساب...');

            let finalBuffer = res.buffer;
            try {
                finalBuffer = await transcodeToWhatsApp(res.buffer);
            } catch (transcodeErr) {
                logger.error('فشل ترميز فيديو يوتيوب، إرسال النسخة الأصلية:', transcodeErr.message);
            }

            await ctx.sock.sendMessage(ctx.from, {
                video: finalBuffer,
                caption: `🎥 *${videoTitle}*\n⏱️ المدة: ${formatDuration(duration)}`,
                mimetype: 'video/mp4'
            }, { quoted: ctx.msg });

        } catch (e) {
            logger.error('خطأ في تحميل فيديو يوتيوب:', e);
            await ctx.reply('❌ حدث خطأ أثناء تحميل الفيديو. تأكد من صحة الرابط أو جرب مرة أخرى.');
        }
    });
}, {
    description: 'البحث وتحميل فيديوهات من يوتيوب',
    category: '⬇️ تحميلات'
});

// 🎵 تحميل صوت من اليوتيوب
registerCommand('صوت', async (ctx) => {
    const query = ctx.args.join(' ');
    if (!query) {
        return ctx.reply('❌ يرجى إدخال اسم المقطع أو رابط اليوتيوب!');
    }

    await ctx.reply('⏳ تم إضافة طلبك إلى طابور التحميل، جاري التحضير...');

    downloadQueue.add(async () => {
        try {
            let videoUrl = query;
            let title = 'YouTube Audio';

            if (!/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(query)) {
                const search = await ytSearch(query);
                if (!search.videos || search.videos.length === 0) {
                    return ctx.reply('❌ لم يتم العثور على أي نتائج!');
                }
                const video = search.videos[0];
                videoUrl = video.url;
                title = video.title;
            }

            // فحص المدة قبل التحميل
            const info = await getInfo(videoUrl);
            const duration = info?.duration || 0;
            if (duration > config.limits.maxAudioDuration) {
                return ctx.reply(`❌ المقطع طويل جداً (${formatDuration(duration)})! الحد الأقصى ${formatDuration(config.limits.maxAudioDuration)}.`);
            }

            logger.info(`تحميل صوت يوتيوب: ${videoUrl}`);
            const res = await downloadMedia(videoUrl, { audioOnly: true });

            if (!res.success || !res.buffer) {
                return ctx.reply(`❌ فشل تحميل الصوت. ${res.error || ''}`);
            }

            const audioTitle = res.title || info?.title || title;

            await ctx.sock.sendMessage(ctx.from, {
                audio: res.buffer,
                mimetype: 'audio/mp4',
                fileName: `${audioTitle}.mp3`,
                ptt: false
            }, { quoted: ctx.msg });

        } catch (e) {
            logger.error('خطأ في تحميل صوت يوتيوب:', e);
            await ctx.reply('❌ حدث خطأ أثناء تحميل الصوت. تأكد من صحة الرابط أو جرب مرة أخرى.');
        }
    });
}, {
    description: 'البحث وتحميل مقاطع صوتية من يوتيوب',
    category: '⬇️ تحميلات'
});

// 📋 البحث عن فيديوهات يوتيوب وعرض قائمة
registerCommand('بحث_يوتيوب', async (ctx) => {
    const query = ctx.args.join(' ');
    if (!query) {
        return ctx.reply('❌ يرجى إدخال نص البحث!');
    }

    await ctx.reply('🔍 جاري البحث في يوتيوب...');

    try {
        const search = await ytSearch(query);
        if (!search.videos || search.videos.length === 0) {
            return ctx.reply('❌ لم يتم العثور على نتائج!');
        }

        const videos = search.videos.slice(0, 10);
        let text = `📺 *نتائج البحث عن:* "${query}"\n\n`;
        videos.forEach((v, i) => {
            text += `${i + 1}. *${v.title}*\n`;
            text += `   ⏱️ ${v.timestamp} | 👁️ ${v.views} مشاهدة\n`;
            text += `   🔗 ${v.url}\n\n`;
        });
        text += `\n💡 لتحميل أي فيديو، استخدم الأمر *.فيديو* مع الرابط.`;

        await ctx.reply(text);
    } catch (e) {
        logger.error('خطأ في البحث يوتيوب:', e);
        await ctx.reply('❌ حدث خطأ أثناء البحث.');
    }
}, {
    description: 'البحث عن فيديوهات يوتيوب وعرض قائمة بالنتائج',
    category: '⬇️ تحميلات'
});

// 🎮 تشغيل وبحث تفاعلي مع أزرار تحميل صوت وفيديو
registerCommand('شغل', async (ctx) => {
    const query = ctx.args.join(' ');
    if (!query) {
        return ctx.reply('❌ يرجى إدخال اسم الأغنية أو الفيديو للبحث والتشغيل!');
    }

    await ctx.reply('🔍 جاري البحث في يوتيوب...');

    try {
        let videoUrl = query;
        let video = null;

        if (!/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(query)) {
            const search = await ytSearch(query);
            if (!search.videos || search.videos.length === 0) {
                return ctx.reply('❌ لم يتم العثور على نتائج بحث لمطلبك!');
            }
            video = search.videos[0];
            videoUrl = video.url;
        } else {
            const { getInfo } = await import('../../lib/ytdlp.js');
            const info = await getInfo(query);
            if (info) {
                video = {
                    title: info.title,
                    url: query,
                    duration: info.duration,
                    thumbnail: info.thumbnail
                };
            }
        }

        const title = video?.title || 'فيديو يوتيوب';
        const durationText = video?.timestamp || (video?.duration ? formatDuration(video.duration) : 'غير محدد');
        const viewsText = video?.views || 'غير محدد';
        const url = videoUrl;

        const responseText = `🎬 *نتائج البحث والتشغيل الذكي* 🎬\n\n` +
            `📌 *العنوان:* ${title}\n` +
            `⏱️ *المدة:* ${durationText}\n` +
            `👁️ *المشاهدات:* ${viewsText}\n\n` +
            `👇 اختر طريقة التحميل والتشغيل المفضلة لديك أدناه:`;

        const buttons = [
            { id: `.صوت ${url}`, text: '🎵 تحميل كصوت (MP3)' },
            { id: `.فيديو ${url}`, text: '🎥 تحميل كفيديو (MP4)' }
        ];

        await ctx.replyWithButtons(responseText, '⚔️ Astro Bot v5.0', buttons);

    } catch (e) {
        logger.error('خطأ في تشغيل يوتيوب:', e);
        await ctx.reply('❌ حدث خطأ أثناء تشغيل وبحث المقطع.');
    }
}, {
    description: 'البحث والتشغيل الذكي من يوتيوب بأزرار اختيار صوت أو فيديو',
    category: '⬇️ تحميلات'
});

