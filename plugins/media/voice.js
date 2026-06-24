import { registerCommand } from '../../lib/handler.js';
import { logger } from '../../lib/logger.js';
import { downloadMedia } from '../../lib/media.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);
const tempDir = './data/temp';

// 🎤 تحويل الصوت/الفيديو إلى رسالة صوتية (PTT)
registerCommand('صوتي', async (ctx) => {
    let mediaMsg = ctx.msg.message?.audioMessage || ctx.msg.message?.videoMessage;

    if (!mediaMsg) {
        const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted?.audioMessage) mediaMsg = quoted.audioMessage;
        else if (quoted?.videoMessage) mediaMsg = quoted.videoMessage;
    }

    if (!mediaMsg) {
        return ctx.reply('❌ الرجاء الرد على مقطع صوتي أو فيديو مع كتابة *.صوتي*!');
    }

    const isVideo = !!ctx.msg.message?.videoMessage || !!ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;
    const type = isVideo ? 'video' : 'audio';

    await ctx.reply('⏳ جاري التحويل إلى رسالة صوتية...');

    try {
        const mediaBuffer = await downloadMedia(mediaMsg, type);
        const timestamp = Date.now();
        const inputPath = path.join(tempDir, `ptt_in_${timestamp}`);
        const outputPath = path.join(tempDir, `ptt_out_${timestamp}.mp3`);

        await fs.promises.writeFile(inputPath, mediaBuffer);

        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat('mp3')
                .audioBitrate('64')
                .audioChannels(1)
                .audioFrequency(16000)  // تردد منخفض مناسب للرسائل الصوتية
                .save(outputPath)
                .on('end', resolve)
                .on('error', reject);
        });

        const pttBuffer = await fs.promises.readFile(outputPath);

        try { await fs.promises.unlink(inputPath); } catch (_) {}
        try { await fs.promises.unlink(outputPath); } catch (_) {}

        // إرسال كرسالة صوتية (PTT) مع ضبط ptt = true
        await ctx.sock.sendMessage(ctx.from, {
            audio: pttBuffer,
            mimetype: 'audio/mp4',
            ptt: true
        }, { quoted: ctx.msg });
    } catch (e) {
        logger.error('فشل تحويل الرسالة الصوتية:', e.message);
        await ctx.reply('❌ فشل تحويل الملف إلى رسالة صوتية.');
    }
}, {
    description: 'تحويل الصوت أو الفيديو إلى رسالة صوتية (Voice Note)',
    category: '🎨 وسائط وملصقات'
});
