/**
 * 🎛️ buttonHelper.js — مكتبة الأزرار المركزية لـ Astro Bot v3.0
 * 
 * توفر دوال موحدة لإرسال جميع أنواع الرسائل التفاعلية في واتساب:
 * - أزرار سريعة (Quick Reply)
 * - قوائم منسدلة (List Select)
 * - كاروسيل متعدد البطاقات
 * - أزرار مع صور
 * 
 * كل دالة تتضمن fallback نصي تلقائي في حالة فشل الأزرار.
 */

import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import config from '../config.js';

/**
 * إرسال أزرار سريعة (Quick Reply Buttons)
 * @param {Object} sock - اتصال الواتساب
 * @param {string} jid - معرف المحادثة
 * @param {string} text - نص الرسالة
 * @param {string} footer - نص التذييل
 * @param {Array<{text: string, id: string}>} buttons - قائمة الأزرار
 * @param {Object} [options] - خيارات إضافية (quoted, etc)
 */
export async function sendButtons(sock, jid, text, footer, buttons, options = {}) {
    try {
        const formattedButtons = buttons.map(btn => ({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: btn.text,
                id: btn.id
            })
        }));

        const msg = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: footer || config.botName }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: formattedButtons
                        })
                    })
                }
            }
        }, options.quoted ? { quoted: options.quoted } : {});

        await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
    } catch (e) {
        // Fallback نصي
        let fallback = text + '\n\n';
        buttons.forEach((btn, i) => {
            fallback += `${i + 1}. *${btn.text}* ➜ \`${btn.id}\`\n`;
        });
        if (footer) fallback += `\n${footer}`;
        await sock.sendMessage(jid, { text: fallback }, options.quoted ? { quoted: options.quoted } : {});
    }
}

/**
 * إرسال قائمة منسدلة (List Select Message)
 * @param {Object} sock - اتصال الواتساب
 * @param {string} jid - معرف المحادثة
 * @param {string} text - نص الرسالة
 * @param {string} footer - نص التذييل
 * @param {string} buttonTitle - نص زر فتح القائمة
 * @param {Array<{title: string, rows: Array<{title: string, description: string, id: string}>}>} sections - الأقسام
 * @param {Object} [options] - خيارات إضافية
 */
export async function sendList(sock, jid, text, footer, buttonTitle, sections, options = {}) {
    try {
        const listMessage = {
            title: buttonTitle,
            sections: sections
        };

        const formattedButtons = [
            {
                name: "single_select",
                buttonParamsJson: JSON.stringify(listMessage)
            }
        ];

        const msg = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: footer || config.botName }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: formattedButtons
                        })
                    })
                }
            }
        }, options.quoted ? { quoted: options.quoted } : {});

        await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
    } catch (e) {
        // Fallback نصي
        let fallback = text + '\n\n';
        sections.forEach(sec => {
            fallback += `📂 *${sec.title}*\n`;
            sec.rows.forEach(row => {
                fallback += `  🔹 *${row.title}* ➜ \`${row.id}\`\n`;
                if (row.description) fallback += `     └─ ${row.description}\n`;
            });
            fallback += '\n';
        });
        if (footer) fallback += footer;
        await sock.sendMessage(jid, { text: fallback }, options.quoted ? { quoted: options.quoted } : {});
    }
}

/**
 * إرسال أزرار سريعة مع صورة
 * @param {Object} sock - اتصال الواتساب
 * @param {string} jid - معرف المحادثة
 * @param {Buffer} imageBuffer - بيانات الصورة
 * @param {string} text - نص الرسالة (caption)
 * @param {string} footer - نص التذييل
 * @param {Array<{text: string, id: string}>} buttons - قائمة الأزرار
 * @param {Object} [options] - خيارات إضافية
 */
export async function sendButtonsWithImage(sock, jid, imageBuffer, text, footer, buttons, options = {}) {
    try {
        const { prepareWAMessageMedia } = await import('@whiskeysockets/baileys');
        const mediaMessage = await prepareWAMessageMedia(
            { image: imageBuffer },
            { upload: sock.waUploadToServer }
        );

        const formattedButtons = buttons.map(btn => ({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: btn.text,
                id: btn.id
            })
        }));

        const cards = [
            {
                header: proto.Message.InteractiveMessage.Header.create({
                    title: '',
                    hasMediaAttachment: true,
                    imageMessage: mediaMessage.imageMessage
                }),
                body: proto.Message.InteractiveMessage.Body.create({ text }),
                footer: proto.Message.InteractiveMessage.Footer.create({ text: footer || config.botName }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: formattedButtons
                })
            }
        ];

        const msg = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text: '' }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: config.botName }),
                        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({ cards })
                    })
                }
            }
        }, options.quoted ? { quoted: options.quoted } : {});

        await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
    } catch (e) {
        // Fallback: صورة عادية مع caption
        let fallback = text + '\n\n';
        buttons.forEach((btn, i) => {
            fallback += `${i + 1}. *${btn.text}* ➜ \`${btn.id}\`\n`;
        });
        if (footer) fallback += `\n${footer}`;
        try {
            await sock.sendMessage(jid, { image: imageBuffer, caption: fallback }, options.quoted ? { quoted: options.quoted } : {});
        } catch (_) {
            await sock.sendMessage(jid, { text: fallback }, options.quoted ? { quoted: options.quoted } : {});
        }
    }
}

/**
 * إرسال كاروسيل متعدد البطاقات
 * @param {Object} sock - اتصال الواتساب
 * @param {string} jid - معرف المحادثة
 * @param {Array<{title: string, text: string, footer: string, buttons: Array<{text: string, id: string}>}>} cards - بطاقات الكاروسيل
 * @param {Object} [options] - خيارات إضافية
 */
export async function sendCarousel(sock, jid, cards, options = {}) {
    try {
        const formattedCards = cards.map(card => ({
            header: proto.Message.InteractiveMessage.Header.create({
                title: card.title || '',
                hasMediaAttachment: false
            }),
            body: proto.Message.InteractiveMessage.Body.create({ text: card.text || '' }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: card.footer || config.botName }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: (card.buttons || []).map(btn => ({
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text,
                        id: btn.id
                    })
                }))
            })
        }));

        const msg = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text: '' }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: config.botName }),
                        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({ cards: formattedCards })
                    })
                }
            }
        }, options.quoted ? { quoted: options.quoted } : {});

        await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
    } catch (e) {
        // Fallback نصي
        let fallback = '';
        cards.forEach((card, i) => {
            fallback += `━━━ 📌 ${card.title || `بطاقة ${i + 1}`} ━━━\n`;
            fallback += `${card.text || ''}\n`;
            if (card.buttons) {
                card.buttons.forEach(btn => {
                    fallback += `  🔹 *${btn.text}* ➜ \`${btn.id}\`\n`;
                });
            }
            fallback += '\n';
        });
        await sock.sendMessage(jid, { text: fallback }, options.quoted ? { quoted: options.quoted } : {});
    }
}
