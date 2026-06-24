import { registerCommand } from '../../lib/handler.js';
import { generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import fs from 'fs';

// 1. تجربة الأزرار التفاعلية الحديثة (Interactive Flow Buttons)
registerCommand('زر_تفاعل', async (ctx) => {
    const formattedButtons = [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "🧠 قسم الذكاء",
                id: ".قسم ذكاء"
            })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "🎮 قسم الألعاب",
                id: ".قسم العاب"
            })
        }
    ];

    try {
        const msg = generateWAMessageFromContent(ctx.from, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text: "تجربة أزرار التفاعل الحديثة (Native Flow)" }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: "KnightBot MD" }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: formattedButtons
                        })
                    })
                }
            }
        }, { quoted: ctx.msg });

        await ctx.sock.relayMessage(ctx.from, msg.message, { messageId: msg.key.id });
    } catch (e) {
        ctx.reply("❌ حدث خطأ أثناء إرسال أزرار التفاعل.");
    }
}, {
    description: 'تجربة أزرار التفاعل الحديثة (Native Flow)',
    category: '⚙️ عام'
});

// 2. تجربة أزرار القوالب القديمة (Hydrated Template Buttons)
registerCommand('زر_قالب', async (ctx) => {
    try {
        const msg = generateWAMessageFromContent(ctx.from, {
            viewOnceMessage: {
                message: {
                    templateMessage: {
                        hydratedTemplate: {
                            hydratedContentText: "تجربة أزرار القوالب القديمة (Hydrated Buttons)",
                            hydratedFooterText: "KnightBot MD",
                            hydratedButtons: [
                                {
                                    quickReplyButton: {
                                        displayText: "🧠 قسم الذكاء",
                                        id: ".قسم ذكاء"
                                    }
                                },
                                {
                                    quickReplyButton: {
                                        displayText: "🎮 قسم الألعاب",
                                        id: ".قسم العاب"
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        }, { quoted: ctx.msg });

        await ctx.sock.relayMessage(ctx.from, msg.message, { messageId: msg.key.id });
    } catch (e) {
        ctx.reply("❌ حدث خطأ أثناء إرسال أزرار القوالب.");
    }
}, {
    description: 'تجربة أزرار القوالب القديمة (Hydrated)',
    category: '⚙️ عام'
});

// 3. تجربة قائمة الخيارات المنسدلة (List Select Message)
registerCommand('زر_قائمة', async (ctx) => {
    const listMessage = {
        text: "تجربة القائمة المنسدلة التفاعلية (List Message)",
        footer: "KnightBot MD",
        title: "📋 قائمة الأقسام",
        buttonText: "انقر للاختيار",
        sections: [
            {
                title: "أقسام البوت الرئيسية",
                rows: [
                    { title: "🧠 قسم الذكاء الاصطناعي", rowId: ".قسم ذكاء", description: "التحدث مع الذكاء الاصطناعي وشخصيات البوت" },
                    { title: "🎮 قسم الألعاب والتسلية", rowId: ".قسم العاب", description: "المبارزات، العمل، التعدين والزواج" }
                ]
            }
        ]
    };

    try {
        await ctx.sock.sendMessage(ctx.from, listMessage, { quoted: ctx.msg });
    } catch (e) {
        ctx.reply("❌ حدث خطأ أثناء إرسال القائمة المنسدلة.");
    }
}, {
    description: 'تجربة قائمة الخيارات المنسدلة التفاعلية',
    category: '⚙️ عام'
});

// 4. تجربة أزرار الاستطلاع والتصويت (Poll Creation Buttons - الأكثر استقراراً 100%)
registerCommand('زر_تصويت', async (ctx) => {
    try {
        await ctx.sock.sendMessage(ctx.from, {
            poll: {
                name: "📊 اختر قسم البوت الذي تود تصفحه:",
                values: [".قسم ذكاء", ".قسم العاب", ".قسم تحميل", ".قسم ادوات", ".قسم عام"],
                selectableCount: 1
            }
        }, { quoted: ctx.msg });
    } catch (e) {
        ctx.reply("❌ حدث خطأ أثناء إرسال زر التصويت.");
    }
}, {
    description: 'تجربة أزرار التصويت والاستطلاع المستقرة 100%',
    category: '⚙️ عام'
});
