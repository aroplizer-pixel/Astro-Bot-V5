import { registerCommand } from '../../lib/handler.js';
import { downloadMedia } from '../../lib/media.js';
import sharp from 'sharp';
import axios from 'axios';

// 🔄 تحويل الملصق إلى صورة
registerCommand('لصورة', async (ctx) => {
    let msgContent = null;

    // التأكد من الاقتباس (Quoted Message)
    const quotedMsg = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMsg && quotedMsg.stickerMessage) {
        msgContent = quotedMsg.stickerMessage;
    }

    if (!msgContent) {
        return ctx.reply('❌ يرجى الرد على الملصق (ستيكر) الذي تريد تحويله لصورة بكتابة *.لصورة*');
    }

    await ctx.reply('⏳ جاري تحويل الملصق إلى صورة عادية...');

    try {
        const webpBuffer = await downloadMedia(msgContent, 'sticker');
        const pngBuffer = await sharp(webpBuffer).png().toBuffer();

        await ctx.sock.sendMessage(ctx.from, {
            image: pngBuffer,
            caption: '📸 تم تحويل الملصق بنجاح إلى صورة عادية.'
        }, { quoted: ctx.msg });

    } catch (e) {
        console.error(e);
        await ctx.reply('❌ فشل تحويل الملصق لصورة. تأكد من أن الملصق غير تالف.');
    }
}, {
    description: 'تحويل ملصقات الواتساب (ستيكرات) إلى صور عادية',
    category: '🎨 وسائط وملصقات'
});

// 🗣️ نطق النصوص (Text-To-Speech)
registerCommand('قول', async (ctx) => {
    const text = ctx.args.join(' ');
    if (!text) {
        return ctx.reply('❌ يرجى كتابة النص الذي تريد من البوت قوله/نطقه بصوت مسموع!');
    }
    if (text.length > 200) {
        return ctx.reply('❌ النص طويل جداً! الحد الأقصى للنطق هو 200 حرف.');
    }

    await ctx.reply('⏳ جاري توليد البصمة الصوتية...');

    try {
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encodeURIComponent(text)}`;
        const response = await axios.get(ttsUrl, { responseType: 'arraybuffer' });
        const audioBuffer = Buffer.from(response.data);

        await ctx.sock.sendMessage(ctx.from, {
            audio: audioBuffer,
            mimetype: 'audio/mp4',
            ptt: true // إرسالها كبصمة صوتية مسجلة فوراً
        }, { quoted: ctx.msg });

    } catch (e) {
        console.error(e);
        await ctx.reply('❌ فشل تحويل النص لبصمة صوتية.');
    }
}, {
    description: 'نطق الكلمات وتحويل النصوص لبصمة صوتية مسموعة',
    category: '🎨 وسائط وملصقات'
});
