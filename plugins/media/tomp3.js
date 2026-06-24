import { registerCommand } from '../../lib/handler.js';
import { logger } from '../../lib/logger.js';
import { downloadMedia } from '../../lib/media.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);
const tempDir = './data/temp';

// 🎵 تحويل الفيديو أو المقطع الصوتي إلى MP3
registerCommand('mp3', async (ctx) => {
    let mediaMsg = ctx.msg.message?.videoMessage || ctx.msg.message?.audioMessage;

    if (!mediaMsg) {
        const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted?.videoMessage) mediaMsg = quoted.videoMessage;
        else if (quoted?.audioMessage) mediaMsg = quoted.audioMessage;
    }

    if (!mediaMsg) {
        return ctx.reply('❌ الرجاء الرد على فيديو أو مقطع صوتي مع كتابة *.mp3*!');
    }

    const isVideo = !!ctx.msg.message?.videoMessage || !!ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;
    const type = isVideo ? 'video' : 'audio';

    await ctx.reply('⏳ جاري تحويل الملف إلى MP3...');

    try {
        const mediaBuffer = await downloadMedia(mediaMsg, type);
        const timestamp = Date.now();
        const inputPath = path.join(tempDir, `conv_in_${timestamp}`);
        const outputPath = path.join(tempDir, `conv_out_${timestamp}.mp3`);

        await fs.promises.writeFile(inputPath, mediaBuffer);

        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat('mp3')
                .audioBitrate('128')
                .save(outputPath)
                .on('end', resolve)
                .on('error', reject);
        });

        const mp3Buffer = await fs.promises.readFile(outputPath);

        // تنظيف
        try { await fs.promises.unlink(inputPath); } catch (_) {}
        try { await fs.promises.unlink(outputPath); } catch (_) {}

        await ctx.sock.sendMessage(ctx.from, {
            audio: mp3Buffer,
            mimetype: 'audio/mp4',
            fileName: `converted_${timestamp}.mp3`
        }, { quoted: ctx.msg });
    } catch (e) {
        logger.error('فشل تحويل MP3:', e.message);
        await ctx.reply('❌ فشل تحويل الملف إلى MP3.');
    }
}, {
    description: 'تحويل الفيديو أو الصوت إلى ملف MP3',
    category: '🎨 وسائط وملصقات'
});
