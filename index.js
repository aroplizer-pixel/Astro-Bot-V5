process.env.YTDL_NO_DEBUG_FILE = 'true';

import { connectToWhatsApp } from './lib/connection.js';
import { handleMessage, loadPlugins } from './lib/handler.js';
import { logger } from './lib/logger.js';
import { startAdhkarAutomation } from './lib/adhkar.js';
import { cleanupTempDir } from './lib/utils.js';
import path from 'path';

// ═══════════════════════════════════════════════════════════
// 🛡️ معالجة الأخطاء العامة لمنع انهيار البوت بالكامل
// ═══════════════════════════════════════════════════════════
process.on('uncaughtException', (err) => {
    logger.error('💥 خطأ غير معالج (uncaughtException):', err);
    // لا نخرج من العملية - نحاول الاستمرار
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 وعد مرفوض غير معالج (unhandledRejection):', reason);
    // لا نخرج - مجرد تسجيل
});

process.on('warning', (warning) => {
    // تصفية تحذيرات Node المزعجة المعروفة
    if (warning.name === 'ExperimentalWarning') return;
    logger.warn(`⚠️ تحذير: ${warning.name}: ${warning.message}`);
});

// التعامل مع إشارات الإيقاف بأمان
process.on('SIGINT', () => {
    logger.warn('🛑 تم استلام إشارة الإيقاف (SIGINT). جاري الإغلاق بأمان...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.warn('🛑 تم استلام إشارة الإنهاء (SIGTERM). جاري الإغلاق...');
    process.exit(0);
});

console.clear();
console.log(`
⚔️═══════════════════════════════════════════⚔️
║            🤖 ASTRO BOT v2.0              ║
║            الجيل الجديد لعام 2026         ║
║            المطور: أدهم خالد              ║
⚔️═══════════════════════════════════════════⚔️
`);

async function start() {
    try {
        // تنظيف الملفات المؤقتة الأقدم من ساعة
        const tempDir = path.resolve('./data/temp');
        const deleted = cleanupTempDir(tempDir, 60 * 60 * 1000);
        if (deleted > 0) {
            logger.info(`🧹 تم تنظيف ${deleted} ملف مؤقت قديم.`);
        }

        logger.info('📂 تحميل الإضافات...');
        await loadPlugins();
        logger.success('✅ تم تحميل الإضافات بنجاح!');

        logger.info('🚀 جاري الاتصال بـ WhatsApp...');
        const sock = await connectToWhatsApp(handleMessage);

        // بدء جدولة التذكير التلقائي بالأذكار والآيات القرآنية
        startAdhkarAutomation(sock);
        logger.success('✅ تم تشغيل نظام التذكير التلقائي بالأذكار!');

        logger.success('🎉 البوت يعمل الآن وجاهز للاستخدام!');
    } catch (err) {
        logger.error('❌ فشل تشغيل البوت:', err);
        // إعادة المحاولة بعد 5 ثوانٍ في حالة فشل الإقلاع
        logger.warn('⏳ سيتم إعادة المحاولة خلال 5 ثوانٍ...');
        setTimeout(() => start(), 5000);
    }
}

start();
