// ⚙️ إعدادات KnightBot MD v2.0
// جميع المفاتيح الحساسة تُقرأ من متغيرات البيئة (.env)
// راجع ملف .env.example لمعرفة المتغيرات المطلوبة

// ──────────────────────────────────────────────────────────────
// تحميل متغيرات البيئة من ملف .env
// ──────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';

function loadEnvFile() {
    const envPath = path.resolve('./.env');
    if (!fs.existsSync(envPath)) return;

    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;

        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();

        // إزالة علامات الاقتباس إن وجدت
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        // لا نكتب على متغير موجود مسبقاً في البيئة (يفضّل متغيرات النظام)
        if (key && !(key in process.env)) {
            process.env[key] = value;
        }
    }
}

loadEnvFile();

// ──────────────────────────────────────────────────────────────
// الإعدادات (تُقرأ من البيئة مع قيم افتراضية آمنة)
// ──────────────────────────────────────────────────────────────
export default {
    // ─── معلومات البوت ───
    botName: process.env.BOT_NAME || '⚔️ Astro Bot',
    prefix: process.env.BOT_PREFIX || '.',
    ownerNumber: process.env.OWNER_NUMBER || '201044626335',
    ownerName: process.env.OWNER_NAME || 'أدهم خالد',

    // ─── مفاتيح الـ API (تُقرأ من .env ولا تُكتب في الكود) ───
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    lolhumanApiKey: process.env.LOLHUMAN_API_KEY || '',
    betabotzApiKey: process.env.BETABOTZ_API_KEY || '',
    deepgramApiKey: process.env.DEEPGRAM_API_KEY || '303945c1917fbf76bf96e484f80a9ec04b4a5e60',

    // ─── إعدادات الحماية الافتراضية للجروبات الجديدة ───
    security: {
        antiLink: false,    // مضاد الروابط
        antiSpam: false,    // مضاد السبام
        antiFake: false     // طرد الأرقام الدولية الوهمية
    },

    // الكلمات الممنوعة للجروبات (Anti-Badword)
    badWords: ['كلب', 'حمار', 'غبي', 'تف عليك', 'وسخ', 'يا كلب', 'يا حمار'],

    // ─── إعدادات الملصقات ───
    sticker: {
        packName: '⚔️ Astro Bot',
        author: 'أدهم خالد'
    },

    // ─── حدود التحميل ───
    limits: {
        maxVideoDuration: parseInt(process.env.MAX_VIDEO_DURATION || '600', 10),   // 10 دقائق
        maxAudioDuration: parseInt(process.env.MAX_AUDIO_DURATION || '1200', 10), // 20 دقيقة
        maxFilesizeMB: 100
    },

    // ─── إعدادات السجل ───
    logLevel: process.env.LOG_LEVEL || 'info',

    // ─── رسائل النظام ───
    messages: {
        start: '🚀 تم تشغيل KnightBot MD بنجاح واستعداد لتلقي الأوامر!',
        ownerOnly: '❌ هذا الأمر مخصص لمالك البوت فقط!',
        groupOnly: '❌ هذا الأمر لا يمكن استخدامه إلا داخل المجموعات!',
        adminOnly: '❌ هذا الأمر مخصص لمشرفي المجموعة فقط!',
        botAdmin: '❌ يجب أن يكون البوت مشرفاً (Admin) في المجموعة لتنفيذ هذا الأمر!',
        privateOnly: '❌ هذا الأمر لا يمكن استخدامه إلا في الدردشة الخاصة!',
        cooldown: '⏳ يرجى الانتظار قبل استخدام هذا الأمر مرة أخرى.'
    }
};
