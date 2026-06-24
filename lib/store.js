export const messageStore = new Map();

/**
 * حفظ الرسالة في مخزن الذاكرة المؤقت
 * @param {Object} msg - الرسالة المستلمة من الواتساب
 */
export function saveMessage(msg) {
    if (!msg?.key?.id) return;
    messageStore.set(msg.key.id, msg);

    // تنظيف الذاكرة وتحديد سقف 2000 رسالة فقط لتفادي استهلاك الرام
    if (messageStore.size > 2000) {
        const firstKey = messageStore.keys().next().value;
        messageStore.delete(firstKey);
    }
}

/**
 * جلب الرسالة الأصلية من الذاكرة عبر المعرف الخاص بها
 * @param {string} id - معرف الرسالة (message ID)
 * @returns {Object|null}
 */
export function getMessage(id) {
    return messageStore.get(id) || null;
}
