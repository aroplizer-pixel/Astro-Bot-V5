// 🔄 نظام إعادة الاتصال التلقائي مع backoff تصاعدي
// يمنع الحلقات اللانهائية عند فشل الاتصال المتكرر

import { logger } from './logger.js';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;  // ثانيتين كأساس
const MAX_DELAY_MS = 60000;  // دقيقة كحد أقصى

let retryCount = 0;
let lastResetTime = Date.now();
let restartCount = 0;

/**
 * تسجيل محاولة اتصال فاشلة وحساب وقت الانتظار المناسب
 * @returns {{shouldRetry: boolean, delayMs: number}}
 */
export function recordFailure() {
    const now = Date.now();

    // إعادة ضبط العداد إذا مرّ أكثر من 10 دقائق على آخر فشل (الاستقرار عاد)
    if (now - lastResetTime > 10 * 60 * 1000) {
        retryCount = 0;
    }
    lastResetTime = now;

    retryCount++;

    if (retryCount > MAX_RETRIES) {
        logger.error(`🚫 تجاوز الحد الأقصى لمحاولات إعادة الاتصال (${MAX_RETRIES}). توقف الإعادة التلقائي.`);
        return { shouldRetry: false, delayMs: 0 };
    }

    // backoff تصاعدي: 2s, 4s, 8s, 16s, 32s (مع حد أقصى 60s)
    const delayMs = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount - 1), MAX_DELAY_MS);
    logger.warn(`⏳ محاولة إعادة الاتصال #${retryCount} خلال ${Math.round(delayMs / 1000)} ثانية...`);

    return { shouldRetry: true, delayMs };
}

/**
 * تسجيل اتصال ناجح - يعيد ضبط العداد
 */
export function recordSuccess() {
    if (retryCount > 0) {
        logger.success('✅ تم استعادة الاتصال بنجاح بعد المحاولات السابقة.');
    }
    retryCount = 0;
}

/**
 * إعادة تشغيل العملية بالكامل (تُستخدم مع أمر إعادة التشغيل)
 */
export function fullRestart(reason = 'manual') {
    restartCount++;
    logger.warn(`🔄 إعادة تشغيل البوت (السبب: ${reason}). عدد مرات إعادة التشغيل: ${restartCount}`);
    setTimeout(() => {
        process.exit(1); // الخروج - سيقوم PM2/Docker بإعادة التشغيل
    }, 1500);
}

/**
 * الحصول على إحصائيات الاستقرار
 */
export function getStats() {
    return {
        retryCount,
        restartCount,
        lastResetTime,
        isStable: retryCount === 0
    };
}
