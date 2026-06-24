import { registerCommand } from '../../lib/handler.js';
import { logger } from '../../lib/logger.js';
import axios from 'axios';

// 🌤️ حالة الطقس
registerCommand('طقس', async (ctx) => {
    const city = ctx.args.join(' ').trim();
    if (!city) {
        return ctx.reply('❌ يرجى إدخال اسم المدينة!\n💡 *استخدام:* .طقس القاهرة');
    }

    await ctx.reply('🌤️ جاري البحث عن حالة الطقس...');

    try {
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
                current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
                timezone: 'auto',
                search: city,
                count: 1
            },
            timeout: 10000
        });

        // محاولة الترجمة الجغرافية أولاً
        let weatherData = null;
        try {
            const geoRes = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
                params: { name: city, count: 1, language: 'ar' },
                timeout: 5000
            });
            if (geoRes.data?.results?.length > 0) {
                const loc = geoRes.data.results[0];
                const forecast = await axios.get('https://api.open-meteo.com/v1/forecast', {
                    params: {
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
                        timezone: 'auto'
                    },
                    timeout: 10000
                });
                weatherData = { location: loc.name, data: forecast.data.current };
            }
        } catch (_) {}

        if (!weatherData) {
            return ctx.reply('❌ لم يتم العثور على المدينة. تأكد من الاسم.');
        }

        const { location, data } = weatherData;
        const weatherCodes = {
            0: '☀️ صافٍ', 1: '🌤️ غيوم خفيفة', 2: '⛅ غيوم متوسطة', 3: '☁️ غيوم كثيفة',
            45: '🌫️ ضباب', 48: '🌫️ ضباب صقيع', 51: '🌧️ رذاذ خفيف', 53: '🌧️ رذاذ', 55: '🌧️ رذاذ كثيف',
            61: '🌧️ مطر خفيف', 63: '🌧️ مطر', 65: '🌧️ مطر غزير', 71: '🌨️ ثلج خفيف', 73: '🌨️ ثلج', 75: '🌨️ ثلج كثيف',
            80: '🌧️ زخات خفيفة', 81: '🌧️ زخات', 82: '⛈️ عواصف', 95: '⛈️ عاصف رعدية'
        };

        const weatherDesc = weatherCodes[data.weather_code] || '🌡️ غير معروف';

        let text = `🌤️ *حالة الطقس: ${location}*\n\n`;
        text += `${weatherDesc}\n`;
        text += `🌡️ *الحرارة:* ${Math.round(data.temperature_2m)}°C\n`;
        text += `💧 *الرطوبة:* ${data.relative_humidity_2m}%\n`;
        text += `💨 *سرعة الرياح:* ${Math.round(data.wind_speed_10m)} كم/س\n`;

        await ctx.reply(text);
    } catch (e) {
        logger.error('خطأ في حالة الطقس:', e.message);
        await ctx.reply('❌ فشل جلب حالة الطقس. حاول لاحقاً.');
    }
}, {
    description: 'حالة الطقس لأي مدينة في العالم',
    category: '🛠️ أدوات'
});

// 🧮 حاسبة
registerCommand('حاسبة', async (ctx) => {
    const expression = ctx.args.join(' ').trim();
    if (!expression) {
        return ctx.reply('❌ يرجى إدخال المعادلة!\n💡 *استخدام:* .حاسبة 2+2*3 أو .حاسبة sqrt(16)');
    }

    // تحديد المعادلات الرياضية الآمنة فقط
    const safePattern = /^[\d\s+\-*/().^%sqrt,pow,ceil,floor,round,abs,sin,cos,tan,log,PI,E]+$/;
    if (!safePattern.test(expression.replace(/sqrt|pow|ceil|floor|round|abs|sin|cos|tan|log|PI|E/g, ''))) {
        return ctx.reply('❌ المعادلة تحتوي على رموز غير مسموح بها!');
    }

    try {
        // تقييم المعادلة بأمان باستخدام Function
        const sanitized = expression
            .replace(/sqrt/g, 'Math.sqrt')
            .replace(/pow/g, 'Math.pow')
            .replace(/ceil/g, 'Math.ceil')
            .replace(/floor/g, 'Math.floor')
            .replace(/round/g, 'Math.round')
            .replace(/abs/g, 'Math.abs')
            .replace(/\bsin\b/g, 'Math.sin')
            .replace(/\bcos\b/g, 'Math.cos')
            .replace(/\btan\b/g, 'Math.tan')
            .replace(/\blog\b/g, 'Math.log')
            .replace(/\bPI\b/g, 'Math.PI')
            .replace(/\bE\b/g, 'Math.E')
            .replace(/\^/g, '**');

        const result = new Function(`return (${sanitized})`)();
        await ctx.reply(`🧮 *الحاسبة*\n\n📝 المعادلة: ${expression}\n📐 النتيجة: *${result}*`);
    } catch (e) {
        await ctx.reply('❌ المعادلة غير صحيحة! تحقق من الصيغة.');
    }
}, {
    description: 'حاسبة رياضية بسيطة',
    category: '🛠️ أدوات'
});

// 🕐 التاريخ والوقت
registerCommand('وقت', async (ctx) => {
    const now = new Date();

    let text = `🕐 *التاريخ والوقت الحالي*\n\n`;
    text += `📅 التاريخ: ${now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    text += `🕐 الوقت: ${now.toLocaleTimeString('ar-EG', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}\n`;
    text += `⏱️ التوقيت العالمي: ${now.toUTCString()}\n`;
    text += `📊 التاريخ الميلادي: ${now.toISOString().split('T')[0]}\n`;

    // تحويل للتاريخ الهجري تقريبي
    const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric', month: 'long', year: 'numeric'
    }).format(now);
    text += `🌙 التاريخ الهجري: ${hijriDate}`;

    await ctx.reply(text);
}, {
    description: 'عرض التاريخ والوقت الحالي (ميلادي وهجري)',
    category: '🛠️ أدوات'
});

// 📏 تقصير رابط
registerCommand('رابط_قصير', async (ctx) => {
    const url = ctx.args[0];
    if (!url) {
        return ctx.reply('❌ يرجى إدخال الرابط المراد تقصيره!');
    }

    if (!/^https?:\/\//i.test(url)) {
        return ctx.reply('❌ يرجى إدخال رابط صحيح يبدأ بـ http أو https!');
    }

    await ctx.reply('⏳ جاري تقصير الرابط...');

    try {
        const response = await axios.post('https://cleanuri.com/api/1.0/', {
            url: url
        }, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000
        });

        if (response.data?.result_url) {
            await ctx.reply(`✅ تم تقصير الرابط بنجاح!\n\n🔗 الأصلي: ${url}\n📏 المختصر: ${response.data.result_url}`);
        } else {
            await ctx.reply('❌ فشل تقصير الرابط. حاول لاحقاً.');
        }
    } catch (e) {
        logger.error('فشل تقصير الرابط:', e.message);
        await ctx.reply('❌ فشل تقصير الرابط. حاول لاحقاً.');
    }
}, {
    description: 'تقصير الروابط الطويلة',
    category: '🛠️ أدوات'
});

// 🔍 تحويل النص لـ QR Code
registerCommand('qr', async (ctx) => {
    const text = ctx.args.join(' ').trim();
    if (!text) {
        return ctx.reply('❌ يرجى إدخال النص أو الرابط لتحويله لـ QR!');
    }

    await ctx.reply('⏳ جاري إنشاء QR Code...');

    try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(text)}&format=png`;
        const response = await axios.get(qrUrl, { responseType: 'arraybuffer', timeout: 10000 });

        await ctx.sock.sendMessage(ctx.from, {
            image: Buffer.from(response.data),
            caption: `📱 *QR Code*\n📝 المحتوى: ${text}`
        }, { quoted: ctx.msg });
    } catch (e) {
        logger.error('فشل إنشاء QR:', e.message);
        await ctx.reply('❌ فشل إنشاء QR Code.');
    }
}, {
    description: 'تحويل النص أو الرابط إلى صورة QR Code',
    category: '🛠️ أدوات'
});

// 🎨 صانع الشعارات والكتابة بالـ 3D والخطوط المزخرفة
const logoMakerCmd = async (ctx) => {
    const text = ctx.args.join(' ').trim();
    if (!text) {
        return ctx.reply('❌ يرجى إدخال النص لصناعة الشعار!\n💡 *مثال:* .شعار نايت بوت');
    }

    await ctx.reply('🎨 جاري صناعة شعارك وتطبيق التأثيرات ثلاثية الأبعاد...');

    try {
        const effect = "بحر-معدني-3D";
        const apiUrl = `http://www.emam-api.web.id/home/sections/Tools/api/v1/logoMaker/create?effect=${encodeURIComponent(effect)}&text=${encodeURIComponent(text)}`;
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 30000 });
        const buffer = Buffer.from(response.data);

        await ctx.sock.sendMessage(ctx.from, {
            image: buffer,
            caption: `🎨 *شعار مخصص:* ${text}\n✨ التأثير: بحر معدني ثلاثي الأبعاد`
        }, { quoted: ctx.msg });
    } catch (e) {
        logger.error('فشل إنشاء الشعار:', e.message);
        await ctx.reply('❌ فشل إنشاء الشعار حالياً. يرجى المحاولة لاحقاً.');
    }
};

registerCommand('شعار', logoMakerCmd, {
    description: 'صناعة شعارات وتأثيرات كتابية ثلاثية الأبعاد احترافية',
    category: '🛠️ أدوات'
});

registerCommand('logomaker', logoMakerCmd, {
    description: 'Generate 3D logo text effects',
    category: '🛠️ أدوات'
});
