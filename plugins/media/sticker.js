import { registerCommand, commands } from '../../lib/handler.js';
import { downloadMedia } from '../../lib/media.js';
import { logger } from '../../lib/logger.js';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import config from '../../config.js';

ffmpeg.setFfmpegPath(ffmpegPath);
const tempDir = './data/temp';

/**
 * تحويل الفيديو إلى ملصق متحرك (webp متحرك) متوافق مع واتساب
 */
async function videoToAnimatedSticker(buffer) {
    const timestamp = Date.now();
    const inputPath = path.join(tempDir, `stkin_${timestamp}.mp4`);
    const outputPath = path.join(tempDir, `stkout_${timestamp}.webp`);

    try {
        await fs.promises.writeFile(inputPath, buffer);

        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-vcodec libwebp',
                    '-vf', "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0,format=rgba",
                    '-loop', '0',
                    '-preset', 'default',
                    '-an',
                    '-vsync', '0',
                    '-t', '10'  // أقصى 10 ثواني
                ])
                .save(outputPath)
                .on('end', resolve)
                .on('error', reject);
        });

        const stickerBuffer = await fs.promises.readFile(outputPath);
        return stickerBuffer;
    } finally {
        // تنظيف
        try { await fs.promises.unlink(inputPath); } catch (_) {}
        try { await fs.promises.unlink(outputPath); } catch (_) {}
    }
}

/**
 * إضافة بيانات EXIF للملصق (اسم الحزمة والمؤلف)
 */
async function addStickerMetadata(webpBuffer) {
    // بيانات EXIF بسيطة بتنسيق WebP
    const packName = config.sticker.packName || 'استرو بوت';
    const author = config.sticker.author || 'أدهم خالد';

    const json = {
        'sticker-pack-id': 'astro-bot',
        'sticker-pack-name': packName,
        'sticker-author-name': author
    };

    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);

    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUInt32LE(jsonBuffer.length, 14);

    // إدراج EXIF في ملف WebP بعد رأس الملف
    if (webpBuffer.length < 12) return webpBuffer;
    return Buffer.concat([
        webpBuffer.slice(0, 20),
        exif,
        webpBuffer.slice(20)
    ]);
}

const makeSticker = async (ctx) => {
    let msgContent = null;
    let type = null;

    // التحقق من الرسالة الحالية
    if (ctx.msg.message?.imageMessage) {
        msgContent = ctx.msg.message.imageMessage;
        type = 'image';
    } else if (ctx.msg.message?.videoMessage) {
        msgContent = ctx.msg.message.videoMessage;
        type = 'video';
    }
    // التحقق من الرسالة المقتبسة
    else {
        const quotedMsg = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quotedMsg) {
            if (quotedMsg.imageMessage) {
                msgContent = quotedMsg.imageMessage;
                type = 'image';
            } else if (quotedMsg.videoMessage) {
                msgContent = quotedMsg.videoMessage;
                type = 'video';
            }
        }
    }

    if (!msgContent) {
        return ctx.reply('❌ الرجاء إرسال صورة أو فيديو مع كتابة *.ملصق* أو الرد على صورة/فيديو بها!');
    }

    await ctx.reply('⏳ جاري صناعة الملصق...');

    try {
        const mediaBuffer = await downloadMedia(msgContent, type);

        if (type === 'image') {
            const webpBuffer = await sharp(mediaBuffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp()
                .toBuffer();

            const finalSticker = await addStickerMetadata(webpBuffer);
            await ctx.sock.sendMessage(ctx.from, { sticker: finalSticker }, { quoted: ctx.msg });
        } else {
            // فيديو → ملصق متحرك
            try {
                const animatedBuffer = await videoToAnimatedSticker(mediaBuffer);
                await ctx.sock.sendMessage(ctx.from, { sticker: animatedBuffer }, { quoted: ctx.msg });
            } catch (animErr) {
                // Fallback: استخراج أول فريم كصورة ثابتة
                logger.warn('فشل الملصق المتحرك، استخدام أول فريم:', animErr.message);
                const frameBuffer = await sharp(mediaBuffer, { pages: 1 })
                    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .webp()
                    .toBuffer();
                await ctx.sock.sendMessage(ctx.from, { sticker: frameBuffer }, { quoted: ctx.msg });
            }
        }
    } catch (e) {
        logger.error('فشل تحويل الوسائط إلى ملصق:', e);
        await ctx.reply('❌ فشل تحويل الوسائط إلى ملصق.');
    }
};

registerCommand('ملصق', makeSticker, {
    description: 'تحويل الصور والفيديوهات إلى ملصقات واتساب (الفيديو يصبح متحركاً)',
    category: '🎨 وسائط وملصقات'
});

registerCommand('ستيكر', makeSticker, {
    description: 'تحويل الصور والفيديوهات إلى ملصقات واتساب',
    category: '🎨 وسائط وملصقات'
});

registerCommand('sticker', makeSticker, {
    description: 'تحويل الصور والفيديوهات إلى ملصقات واتساب',
    category: '🎨 وسائط وملصقات'
});
