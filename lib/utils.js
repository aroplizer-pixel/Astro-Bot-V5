// 🛠️ دوال مساعدة مشتركة لـ KnightBot MD v2.0
// تقلل تكرار الكود في الإضافات

import fs from 'fs';
import path from 'path';

/**
 * تنسيق عدد الثواني إلى نص عربي مقروء
 * @param {number} seconds
 * @returns {string} مثال: "2 ساعة و 15 دقيقة و 30 ثانية"
 */
export function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0 ثانية';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (h > 0) parts.push(`${h} ساعة`);
    if (m > 0) parts.push(`${m} دقيقة`);
    if (s > 0 || parts.length === 0) parts.push(`${s} ثانية`);
    return parts.join(' و ');
}

/**
 * تنسيق الأرقام الكبيرة مع فواصل الآلاف
 */
export function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num || 0);
}

/**
 * توليد رقم عشوائي ضمن نطاق [min, max] شاملين
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * اختيار عنصر عشوائي من مصفوفة
 */
export function randomChoice(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * خلط مصفوفة عشوائياً (Fisher-Yates)
 */
export function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * استخراج نص الرسالة الواردة بأي صيغة
 */
export function getMessageText(msg) {
    if (!msg?.message) return '';
    const m = msg.message;

    // فك ترميز استجابة أزرار Native Flow واستخراج معرف الأمر المختار
    if (m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
        try {
            const params = JSON.parse(m.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            if (params && params.id) {
                return params.id;
            }
        } catch (_) {}
    }

    return m.conversation ||
           m.extendedTextMessage?.text ||
           m.imageMessage?.caption ||
           m.videoMessage?.caption ||
           m.buttonsResponseMessage?.selectedButtonId ||
           m.templateButtonReplyMessage?.selectedId ||
           m.listResponseMessage?.singleSelectReply?.selectedRowId ||
           m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
           m.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
           '';
}

/**
 * استخراج الوسائط من الرسالة الحالية أو المقتبسة
 * @returns {{messageContent: Object, type: string|null}}
 */
export function getMediaFromMessage(msg) {
    const m = msg?.message;
    if (!m) return { messageContent: null, type: null };

    // من الرسالة الحالية
    if (m.imageMessage) return { messageContent: m.imageMessage, type: 'image' };
    if (m.videoMessage) return { messageContent: m.videoMessage, type: 'video' };
    if (m.audioMessage) return { messageContent: m.audioMessage, type: 'audio' };
    if (m.stickerMessage) return { messageContent: m.stickerMessage, type: 'sticker' };
    if (m.documentMessage) return { messageContent: m.documentMessage, type: 'document' };

    // من الرسالة المقتبسة
    const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted) {
        if (quoted.imageMessage) return { messageContent: quoted.imageMessage, type: 'image' };
        if (quoted.videoMessage) return { messageContent: quoted.videoMessage, type: 'video' };
        if (quoted.audioMessage) return { messageContent: quoted.audioMessage, type: 'audio' };
        if (quoted.stickerMessage) return { messageContent: quoted.stickerMessage, type: 'sticker' };
        if (quoted.documentMessage) return { messageContent: quoted.documentMessage, type: 'document' };
    }

    return { messageContent: null, type: null };
}

/**
 * استخراج الأرقام المذكورة (mentions) من رسالة
 */
export function getMentioned(msg) {
    return msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

/**
 * استخراج المشارك المقتبس (مثلاً للرد على رسالة شخص)
 */
export function getQuotedParticipant(msg) {
    return msg?.message?.extendedTextMessage?.contextInfo?.participant || null;
}

/**
 * تحويل JID إلى رقم هاتف صرف
 */
export function jidToNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0];
}

/**
 * تنظيف الملفات المؤقتة الأقدم من maxAgeMs في مجلد محدد
 */
export function cleanupTempDir(dir, maxAgeMs = 60 * 60 * 1000) {
    try {
        if (!fs.existsSync(dir)) return 0;
        const files = fs.readdirSync(dir);
        const now = Date.now();
        let deleted = 0;
        for (const file of files) {
            const filePath = path.join(dir, file);
            try {
                const stat = fs.statSync(filePath);
                if (now - stat.mtimeMs > maxAgeMs) {
                    fs.unlinkSync(filePath);
                    deleted++;
                }
            } catch (_) { /* تجاهل */ }
        }
        return deleted;
    } catch (_) {
        return 0;
    }
}

/**
 * انتظار عدد من المللي ثانية
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * تنفيذ دالة مع retry عند الفشل
 * @param {Function} fn دالة ترجع Promise
 * @param {number} retries عدد المحاولات
 * @param {number} delayMs التأخير بين المحاولات
 */
export async function retry(fn, retries = 3, delayMs = 1000) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (i < retries - 1) await sleep(delayMs * (i + 1));
        }
    }
    throw lastError;
}

/**
 * التحقق من أن نص هو رابط HTTP(S) صالح
 */
export function isValidUrl(str) {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

/**
 * اقتطاع نص طويل وإضافة "..." إن تجاوز الحد
 */
export function truncate(str, max = 500) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '...' : str;
}
