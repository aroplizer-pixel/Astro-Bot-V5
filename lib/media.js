import { downloadContentFromMessage } from '@whiskeysockets/baileys';

/**
 * تحميل محتوى الوسائط (صورة، فيديو، الخ) من الرسالة
 * @param {Object} messageContent - جزء الرسالة الذي يحتوي على الوسائط (مثل msg.message.imageMessage)
 * @param {string} type - نوع الوسيط ('image' | 'video' | 'document')
 * @returns {Promise<Buffer>}
 */
export async function downloadMedia(messageContent, type) {
    const stream = await downloadContentFromMessage(messageContent, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}
