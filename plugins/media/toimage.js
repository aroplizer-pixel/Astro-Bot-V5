import { registerCommand } from '../../lib/handler.js';
import { logger } from '../../lib/logger.js';
import { downloadMedia } from '../../lib/media.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const tempDir = './data/temp';

// 🖼️ تحويل ملصق إلى صورة
registerCommand('صورة', async (ctx) => {
    let stickerMsg = ctx.msg.message?.stickerMessage;

    // من الرسالة المقتبسة إن لم توجد مباشرة
    if (!stickerMsg) {
        const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted?.stickerMessage) stickerMsg = quoted.stickerMessage;
    }

    if (!stickerMsg) {
        return ctx.reply('❌ الرجاء الرد على ملصق أو إرسال ملصق مع كتابة *.صورة*!');
    }

    await ctx.reply('⏳ جاري تحويل الملصق إلى صورة...');

    try {
        const stickerBuffer = await downloadMedia(stickerMsg, 'sticker');

        // محاولة استخراج الصورة من ملصق webp
        const imageBuffer = await sharp(stickerBuffer)
            .png()
            .toBuffer();

        await ctx.sock.sendMessage(ctx.from, {
            image: imageBuffer,
            caption: '🖼️ تم تحويل الملصق إلى صورة بنجاح!'
        }, { quoted: ctx.msg });
    } catch (e) {
        logger.error('فشل تحويل الملصق:', e.message);
        await ctx.reply('❌ فشل تحويل الملصق. تأكد أنه ملصق صالح.');
    }
}, {
    description: 'تحويل الملصقات إلى صور عادية',
    category: '🎨 وسائط وملصقات'
});
