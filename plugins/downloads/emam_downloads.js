import { registerCommand } from '../../lib/handler.js';
import { downloadQueue } from '../../lib/queue.js';
import { logger } from '../../lib/logger.js';
import { transcodeToWhatsApp, transcodeAudioToOpus } from '../../lib/transcoder.js';
import axios from 'axios';

// 1. Apple Music Search
const appleMusicCmd = async (ctx) => {
    const text = ctx.args.join(' ');
    if (!text) {
        return ctx.reply('❌ يرجى كتابة اسم الأغنية أو رابط الأغنية من Apple Music!');
    }

    // If it's a URL, try to download (although the download endpoint had some parsing issues, we'll try it)
    if (text.startsWith('http')) {
        await ctx.reply('⏳ جاري محاولة تحميل أغنية Apple Music...');
        downloadQueue.add(async () => {
            try {
                const url = `http://www.emam-api.web.id/home/sections/Download/api/AppleMusic/download?url=${encodeURIComponent(text)}`;
                const response = await axios.get(url, { timeout: 15000 });
                
                if (response.data && response.data.status && response.data.data) {
                    const dlUrl = response.data.data.url || response.data.data;
                    const audioResponse = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 30000 });
                    const audioBuffer = Buffer.from(audioResponse.data);

                    await ctx.sock.sendMessage(ctx.from, {
                        audio: audioBuffer,
                        mimetype: 'audio/mp4'
                    }, { quoted: ctx.msg });
                } else {
                    throw new Error('فشل الحصول على رابط التحميل المباشر');
                }
            } catch (e) {
                logger.error('خطأ في تحميل Apple Music:', e.message);
                await ctx.reply('❌ فشل تحميل الأغنية مباشرة. يرجى البحث عنها يدوياً باستخدام:\n*.applemusic اسم الأغنية*');
            }
        });
    } else {
        // Search Apple Music
        await ctx.reply('🔍 جاري البحث في Apple Music...');
        try {
            const url = `http://www.emam-api.web.id/home/sections/Download/api/AppleMusic/search?q=${encodeURIComponent(text)}`;
            const response = await axios.get(url, { timeout: 15000 });
            
            if (response.data && response.data.status && response.data.data && response.data.data.length > 0) {
                let msgText = `🎵 *نتائج بحث Apple Music لـ:* "${text}"\n\n`;
                const limit = Math.min(response.data.data.length, 10);
                
                for (let i = 0; i < limit; i++) {
                    const song = response.data.data[i];
                    msgText += `${i + 1}. *${song.title}*\n👤 الفنان: ${song.subtitle || 'غير معروف'}\n🔗 الرابط: ${song.link || song.url || 'لا يوجد'}\n\n`;
                }
                
                msgText += `💡 يمكنك نسخ الرابط واستخدامه مع الأمر لتحميله مباشرة.`;
                await ctx.reply(msgText);
            } else {
                await ctx.reply('❌ لم يتم العثور على أي نتائج في Apple Music.');
            }
        } catch (e) {
            logger.error('خطأ في بحث Apple Music:', e.message);
            await ctx.reply('❌ حدث خطأ أثناء البحث في Apple Music.');
        }
    }
};

// 2. SoundCloud Downloader
const soundcloudDl = async (ctx) => {
    const url = ctx.args[0];
    if (!url || !url.startsWith('http')) {
        return ctx.reply('❌ يرجى إدخال رابط مسار SoundCloud صحيح!');
    }

    await ctx.reply('⏳ جاري تحميل المقطع الصوتي من SoundCloud...');

    downloadQueue.add(async () => {
        try {
            const apiUrl = `http://www.emam-api.web.id/home/sections/Download/api/soundcloud/download?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            
            // Check for direct URL (sometimes returns direct string or json)
            let dlUrl = null;
            if (response.data && response.data.url) {
                dlUrl = response.data.url;
            } else if (response.data && response.data.data && response.data.data.downloadUrl) {
                dlUrl = response.data.data.downloadUrl;
            }

            if (!dlUrl) {
                throw new Error(response.data?.error || response.data?.message || 'لم يتم العثور على رابط تحميل');
            }

            const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 45000 });
            const audioBuffer = Buffer.from(audioRes.data);

            await ctx.sock.sendMessage(ctx.from, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg'
            }, { quoted: ctx.msg });

        } catch (e) {
            logger.error('خطأ في تحميل SoundCloud:', e.message);
            await ctx.reply(`❌ فشل تحميل المقطع من SoundCloud. السبب: ${e.message}`);
        }
    });
};

// 3. YouTube Direct Coplit Downloader
const youtubeCoplitDl = async (ctx) => {
    const url = ctx.args[0];
    if (!url || !url.startsWith('http')) {
        return ctx.reply('❌ يرجى إدخال رابط فيديو يوتيوب صحيح!');
    }

    await ctx.reply('⏳ جاري استخراج رابط التحميل المباشر لليوتيوب...');

    downloadQueue.add(async () => {
        try {
            const apiUrl = `http://www.emam-api.web.id/home/sections/Download/api/api/download?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            
            if (response.data && response.data.success && response.data.url) {
                const dlUrl = response.data.url;
                const title = response.data.title || 'YouTube Video';
                
                await ctx.reply('📥 جاري تنزيل وإرسال الفيديو، يرجى الانتظار...');
                
                const vidRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 90000 });
                const videoBuffer = Buffer.from(vidRes.data);

                let finalBuffer = videoBuffer;
                try {
                    finalBuffer = await transcodeToWhatsApp(videoBuffer);
                } catch (trErr) {
                    logger.error('فشل معالجة الفيديو، إرسال الأصلي:', trErr.message);
                }

                await ctx.sock.sendMessage(ctx.from, {
                    video: finalBuffer,
                    caption: `🎬 *${title}*`,
                    mimetype: 'video/mp4'
                }, { quoted: ctx.msg });
            } else {
                throw new Error(response.data?.error || response.data?.message || 'فشل استخراج الفيديو');
            }
        } catch (e) {
            logger.error('خطأ في تحميل يوتيوب Coplit:', e.message);
            await ctx.reply(`❌ فشل تحميل الفيديو من يوتيوب. السبب: ${e.message}`);
        }
    });
};

// 4. YouTube MP3 Converter (Ymcdn)
const youtubeYmcdnDl = async (ctx) => {
    const url = ctx.args[0];
    if (!url || !url.startsWith('http')) {
        return ctx.reply('❌ يرجى إدخال رابط فيديو يوتيوب لتحويله إلى MP3!');
    }

    await ctx.reply('⏳ جاري تحويل فيديو اليوتيوب إلى صوت MP3...');

    downloadQueue.add(async () => {
        try {
            const apiUrl = `http://www.emam-api.web.id/home/sections/Download/api/Youtube/ymcdn?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            
            if (response.data && response.data.status && response.data.data && response.data.data.url) {
                const dlUrl = response.data.data.url;
                const title = response.data.data.title || 'YouTube Audio';

                const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
                const audioBuffer = Buffer.from(audioRes.data);

                await ctx.sock.sendMessage(ctx.from, {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg'
                }, { quoted: ctx.msg });
            } else {
                throw new Error(response.data?.message || 'فشل تحويل اليوتيوب إلى صوت');
            }
        } catch (e) {
            logger.error('خطأ في تحويل يوتيوب MP3 ymcdn:', e.message);
            await ctx.reply(`❌ فشل تحويل المقطع الصوتي من يوتيوب. السبب: ${e.message}`);
        }
    });
};

// 5. Likee Downloader
const likeeDl = async (ctx) => {
    const url = ctx.args[0];
    if (!url || !url.startsWith('http')) {
        return ctx.reply('❌ يرجى إدخال رابط فيديو Likee صحيح!');
    }

    await ctx.reply('⏳ جاري جلب وتحميل فيديو Likee بدون علامة مائية...');

    downloadQueue.add(async () => {
        try {
            const apiUrl = `http://www.emam-api.web.id/home/sections/Download/api/tools/likee?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            
            if (response.data && response.data.status && response.data.result && response.data.result.no_watermark) {
                const dlUrl = response.data.result.no_watermark;
                const nickname = response.data.result.nickname || 'Likee Creator';

                const vidRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 45000 });
                const videoBuffer = Buffer.from(vidRes.data);

                let finalBuffer = videoBuffer;
                try {
                    finalBuffer = await transcodeToWhatsApp(videoBuffer);
                } catch (trErr) {
                    logger.error('فشل معالجة فيديو Likee، إرسال الأصلي:', trErr.message);
                }

                await ctx.sock.sendMessage(ctx.from, {
                    video: finalBuffer,
                    caption: `🎬 *فيديو من Likee لـ:* ${nickname}`,
                    mimetype: 'video/mp4'
                }, { quoted: ctx.msg });
            } else {
                throw new Error(response.data?.message || 'فشل الحصول على رابط بدون علامة مائية');
            }
        } catch (e) {
            logger.error('خطأ في تحميل فيديو Likee:', e.message);
            await ctx.reply(`❌ فشل تحميل فيديو Likee. السبب: ${e.message}`);
        }
    });
};

// Register commands
registerCommand('ابل_ميوزك', appleMusicCmd, {
    description: 'البحث وتحميل المقاطع الصوتية من Apple Music',
    category: '⬇️ تحميلات'
});

registerCommand('applemusic', appleMusicCmd, {
    description: 'Search and download tracks from Apple Music',
    category: '⬇️ تحميلات'
});

registerCommand('ساوند', soundcloudDl, {
    description: 'تحميل المقاطع الصوتية من SoundCloud',
    category: '⬇️ تحميلات'
});

registerCommand('soundcloud', soundcloudDl, {
    description: 'Download audio files from SoundCloud',
    category: '⬇️ تحميلات'
});

registerCommand('يوت_سريع', youtubeCoplitDl, {
    description: 'تحميل فيديو من يوتيوب برابط مباشر سريع جداً',
    category: '⬇️ تحميلات'
});

registerCommand('ytdown', youtubeCoplitDl, {
    description: 'Download YouTube video quickly using direct extraction',
    category: '⬇️ تحميلات'
});

registerCommand('يوت_صوت', youtubeYmcdnDl, {
    description: 'تحميل المقطع الصوتي فقط من فيديو يوتيوب بصيغة MP3',
    category: '⬇️ تحميلات'
});

registerCommand('ytmp3', youtubeYmcdnDl, {
    description: 'Download audio only from YouTube video',
    category: '⬇️ تحميلات'
});

registerCommand('لايكي', likeeDl, {
    description: 'تحميل فيديوهات Likee بدون علامة مائية',
    category: '⬇️ تحميلات'
});

registerCommand('likee', likeeDl, {
    description: 'Download Likee videos without watermark',
    category: '⬇️ تحميلات'
});
