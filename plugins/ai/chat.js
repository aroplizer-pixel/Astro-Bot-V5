import { registerCommand, commands } from '../../lib/handler.js';
import { database } from '../../lib/db.js';
import config from '../../config.js';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../lib/logger.js';
import { transcodeAudioToOpus } from '../../lib/transcoder.js';
import { generateContentLive } from '../../lib/live_gemini.js';

// تعريف الشخصيات والتعديل المصاحب للموجه (Prompt Modifiers)
const personas = {
    default: {
        name: '🙋‍♂️ أسترو (شاب مصري مرح ورومانسي)',
        prefix: '',
        systemPrompt: `تقمص شخصية "أسترو" (Astro)، وهو شاب مصري حقيقي عنده 21 سنة، دمه خفيف، مرح، فرفوش، رومانسي أحياناً وبسيط جداً.
تحدث بالعامية المصرية الدارجة والشعبية كأنك صديق مقرب وبيتكلم شات على واتساب.
تعليمات مهمة جداً لأسلوبك:
1. ردودك لازم تكون قصيرة جداً وموجزة ولذيذة (متكتبش جرايد أو كلام طويل وممل إلا لو انطلب منك بالتفصيل).
2. استخدم إيموجيز لطيفة ومناسبة لكلامك بس بدون مبالغة تفقد الكلام طبيعيته.
3. اهتم جداً بالروح المصرية الفكاهية والجدعنة وصيغ كلامك زي الشباب المصري الحقيقي (زي: "يا زميلي"، "يا برو"، "حبيبي يا غالي"، "يسطى"، "روقان"، "فكك"، "منور يا صاحبي").
4. لو حد سألك إنت مين، قوله أنا أسترو رفيقك الذكي.
5. تجنب الفصحى تماماً في طريقة كلامك إلا لو كنت بتقتبس حاجة أو بتكتب كود أو بتشرح حاجة علمية تستدعي الفصحى.
6. رد مباشرة بالرسالة النهائية فقط دون أي تفكير بصوت عالٍ، أو كتابة خيارات، أو تخطيط، أو تحليل للمدخلات. أرسل جملة الرد مباشرة كما ينطقها أسترو.`
    },
    funny: {
        name: '🤡 المشاكس الساخر (ردود كوميدية وفكاهية)',
        prefix: 'أجب على السؤال التالي بطريقة ساخرة وفكاهية ومضحكة جداً بالعامية المصرية، واستخدم رموزاً تعبيرية ضاحكة بشكل متكرر: '
    },
    scientist: {
        name: '👨‍🔬 البروفيسور العبقري (ردود علمية وفلسفية مفصلة)',
        prefix: 'أجب على السؤال التالي بطريقة علمية وفلسفية دقيقة ومفصلة جداً وباللغة العربية الفصحى كعالم أكاديمي متميز: '
    },
    aggressive: {
        name: '😡 الغاضب والمستفز (تحدي وردود كوميدية غاضبة)',
        prefix: 'أجب على السؤال التالي بلهجة عصبية وغاضبة جداً ومستفزة ولكن كوميدية، واستخدم علامات تعجب وإيموجي غاضب: '
    },
    knight: {
        name: '⚔️ الفارس النبيل (شجاعة وأخلاق الفرسان)',
        prefix: 'تقمص شخصية فارس شجاع ومخلص وفي من العصور الوسطى يدعى "الفارس نايت". أجب على السؤال التالي بلهجة فرسان ملحمية فخمة مليئة بالاحترام والشجاعة والنخوة والعزة العربية الفصحى، مستخدماً عبارات مثل "يا صاح" أو "مولاي" أو "يا رفيقي" أو "بشرفي وسيفي"، واستخدم رموزاً تعبيرية مثل السيوف والدروع والخيول: '
    }
};

// تنظيف وتجريد خطة وخطوات تفكير النموذج للحصول على الرد النهائي فقط
const cleanReasoning = (text) => {
    if (!text) return '';
    let cleaned = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
    
    const lower = cleaned.toLowerCase();
    const hasReasoningKeywords = 
        lower.includes('user says') || 
        lower.includes('persona:') || 
        lower.includes('constraints:') || 
        lower.includes('option 1') || 
        lower.includes('option 2') || 
        lower.includes('option 3') || 
        lower.includes('input:') || 
        lower.includes('thinking:') || 
        lower.includes('thought process') ||
        lower.includes('thinking process');

    if (hasReasoningKeywords) {
        const lines = cleaned.split('\n');
        // 1. Try to find the last line containing Arabic text
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            const arabicMatch = line.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF].*/);
            if (arabicMatch) {
                return arabicMatch[0].replace(/\(.*?\)/g, '').trim();
            }
        }
        // 2. Fallback: find the last non-empty line without reasoning list bullets/headers
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            const lineLower = line.toLowerCase();
            if (line && 
                !line.startsWith('•') && 
                !line.startsWith('*') && 
                !line.startsWith('-') && 
                !lineLower.includes('user says') && 
                !lineLower.includes('persona') && 
                !lineLower.includes('constraints') && 
                !lineLower.includes('option')) {
                return line.replace(/\(.*?\)/g, '').trim();
            }
        }
    }
    return cleaned.trim();
};

// تنسيق الجداول لتظهر بشكل مرتب كقوائم في واتساب لتجنب تشوه التنسيق الأفقي
const formatTables = (text) => {
    const lines = text.split('\n');
    const newLines = [];
    let inTable = false;
    let tableHeaders = [];

    for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            inTable = true;
            const cols = trimmed.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

            const isSeparator = cols.every(c => /^[:\- ]+$/.test(c));
            if (isSeparator) {
                continue;
            }

            if (tableHeaders.length === 0) {
                tableHeaders = cols;
                newLines.push(cols.map(c => `*${c}*`).join(' | '));
            } else {
                const rowText = cols.map((col, idx) => {
                    const header = tableHeaders[idx] || '';
                    return header ? `• *${header}*: ${col}` : `• ${col}`;
                }).join('\n');
                newLines.push(rowText);
            }
        } else {
            if (inTable) {
                inTable = false;
                tableHeaders = [];
            }
            newLines.push(line);
        }
    }
    return newLines.join('\n');
};

// تنظيف وتنسيق نصوص الماركدوان لتناسب تنسيق واتساب المعتاد وتجنب التشوه
const formatWhatsApp = (text) => {
    if (!text) return '';

    let formatted = formatTables(text);

    formatted = formatted
        .replace(/```[a-zA-Z0-9+#-]+\n/g, '```\n') // إزالة لغة البرمجة من كتل الأكواد البرمجية
        .replace(/\*\*(.*?)\*\*/g, '*$1*')          // تحويل الخط العريض إلى تنسيق واتساب
        .replace(/__(.*?)__/g, '_$1_')              // تحويل الخط المائل إلى تنسيق واتساب
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)') // تحويل روابط الماركدوان لروابط عادية
        .replace(/^(?:#{1,6})\s+(.*)$/gm, (match, p1) => {
            const clean = p1.replace(/[\*_]/g, '');
            return `*${clean}*`;
        })   // تحويل العناوين إلى خط عريض نظيف
        .replace(/^(\s*)[\*\-\+]\s+/gm, '$1• ')     // تحويل النقاط مع الحفاظ على المسافات البادئة
        .replace(/^\s*[\*\-\_]{3,}\s*$/gm, '────────────────────────') // خط فاصل جمالي
        .trim();

    return formatted;
};

// ذاكرة المحادثة المتصلة لتتبع السياق (آخر 5 رسائل)
export const chatHistory = new Map(); // from -> array of { role: 'user' | 'assistant', content: string }

const getChatHistory = (from) => {
    if (!chatHistory.has(from)) {
        chatHistory.set(from, []);
    }
    return chatHistory.get(from);
};

const addMessageToHistory = (from, role, content) => {
    const history = getChatHistory(from);
    history.push({ role, content });
    if (history.length > 5) {
        history.shift();
    }
};

// 1. أمر التحدث مع الذكاء الاصطناعي
const askAI = async (ctx) => {
    const query = ctx.args.join(' ');
    if (!query && !ctx.media) {
        return ctx.reply('❌ يرجى كتابة سؤال أو إرفاق صورة/تسجيل صوتي للبوت!');
    }

    // التحقق من وجود أي مفتاح مفعّل
    const hasGeminiKey = config.geminiApiKey && config.geminiApiKey.trim() !== '';
    const hasOpenRouterKey = config.openrouterApiKey && config.openrouterApiKey.trim() !== '';

    if (!hasGeminiKey && !hasOpenRouterKey) {
        const instructionMessage = `❌ *عذراً، خدمة الذكاء الاصطناعي غير مفعلة حالياً!* 🤖\n\n` +
            `لتفعيل ميزة التحدث مع البوت بالذكاء الاصطناعي، يرجى اتباع إحدى الخطوات التالية:\n\n` +
            `🔹 *الخيار الأول: Google Gemini (رسمي ومباشر):* \n` +
            `1️⃣ احصل على مفتاح مجاني من موقع Google AI Studio:\n` +
            `👉 *https://aistudio.google.com/*\n` +
            `2️⃣ ضعه في حقل \`geminiApiKey\` بملف \`config.js\` كالتالي:\n` +
            `   \`geminiApiKey: 'مفتاحك_هنا'\`\n\n` +
            `🔹 *الخيار الثاني: OpenRouter (بديل مجاني متعدد النماذج):* \n` +
            `1️⃣ احصل على مفتاح من موقع OpenRouter:\n` +
            `👉 *https://openrouter.ai/*\n` +
            `2️⃣ ضعه في حقل \`openrouterApiKey\` بملف \`config.js\` كالتالي:\n` +
            `   \`openrouterApiKey: 'مفتاحك_هنا'\`\n\n` +
            `4️⃣ احفظ الملف وأعد تشغيل البوت لتفعيل الذكاء الاصطناعي فوراً! 🚀`;
        return ctx.reply(instructionMessage);
    }

    try {
        let activePersonaKey = 'default';
        if (ctx.isGroup) {
            const group = database.getGroup(ctx.from);
            activePersonaKey = group.aiPersona || 'default';
        } else {
            const user = database.getUser(ctx.sender);
            activePersonaKey = user.aiPersona || 'default';
        }

        const persona = personas[activePersonaKey] || personas.default;
        const systemPrompt = persona.systemPrompt || personas.default.systemPrompt;
        const fullQuery = persona.prefix ? (persona.prefix + query) : query;

        // التحقق من تفعيل طلب الرد الصوتي (TTS)
        const queryLower = query.toLowerCase();
        const needsVoice = ctx.media?.type === 'audio' || 
                           queryLower.includes('ريكورد') || 
                           queryLower.includes('بصوتك') || 
                           queryLower.includes('صوت') || 
                           queryLower.includes('سجل') || 
                           queryLower.includes('اتكلم') || 
                           queryLower.includes('غني');

        let replyText = null;
        let audioBuffer = null;
        let isAudioOutput = false;

        const history = getChatHistory(ctx.from);

        // 1. محاولة استخدام Google Gemini كخيار أساسي ومجاني ومستقر
        if (hasGeminiKey) {
            const genAI = new GoogleGenerativeAI(config.geminiApiKey);

            // تحديد النماذج لترتيب المحاولة (الأولوية لـ gemma-4-31b-it)
            let modelsToTry = [];
            if (needsVoice) {
                modelsToTry = ['gemini-2.0-flash-exp'];
                isAudioOutput = true;
            } else if (ctx.media) {
                modelsToTry = ['gemini-2.0-flash'];
            } else {
                modelsToTry = ['gemma-4-31b-it', 'gemini-2.0-flash'];
            }

            // بناء سياق الرسائل والأجزاء للنموذج
            const contents = [];
            for (const h of history) {
                contents.push({
                    role: h.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: h.content }]
                });
            }

            const currentParts = [];
            if (ctx.media) {
                currentParts.push({
                    inlineData: {
                        data: ctx.media.buffer.toString('base64'),
                        mimeType: ctx.media.mimeType
                    }
                });
            }
            if (fullQuery) {
                currentParts.push({ text: fullQuery });
            } else if (ctx.media?.type === 'image') {
                currentParts.push({ text: 'بص على الصورة دي وقولي رأيك فيها بالعامية المصرية' });
            } else if (ctx.media?.type === 'audio') {
                currentParts.push({ text: 'اسمع التسجيل الصوتي ده ورد عليه بالعامية المصرية' });
            }

            contents.push({
                role: 'user',
                parts: currentParts
            });

            for (const modelName of modelsToTry) {
                // تحديد دعم الموديل للصوت والتفكير بشكل ديناميكي وصحيح
                const supportsAudio = modelName.includes('tts') || modelName.includes('live');
                const currentIsAudioOutput = isAudioOutput && supportsAudio;

                const isGemini3 = modelName.includes('-3.1-') || modelName.includes('-3.5-') || modelName.includes('-3-');
                const isGemini25 = modelName.includes('-2.5-');
                const supportsThinking = false; // الغاء وضع التفكير حتي يبقي سريع في الرد

                try {
                    logger.info(`Trying Gemini model: ${modelName} (AudioOutput: ${currentIsAudioOutput})`);
                    
                    const modelOptions = { model: modelName };
                    if (systemPrompt) {
                        modelOptions.systemInstruction = systemPrompt;
                    }

                    const model = genAI.getGenerativeModel(modelOptions);
                    
                    const generationConfig = {
                        temperature: modelName.includes('gemma') ? 1.0 : 2.0
                    };

                    if (supportsThinking) {
                        if (isGemini3) {
                            generationConfig.thinkingConfig = {
                                thinkingLevel: 'minimal'
                            };
                        } else if (isGemini25) {
                            generationConfig.thinkingConfig = {
                                thinkingBudget: 0
                            };
                        }
                    }

                    if (currentIsAudioOutput) {
                        generationConfig.responseModalities = ['AUDIO'];
                        generationConfig.speechConfig = {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: 'Puck'
                                }
                            }
                        };
                    }

                    const isLiveModel = modelName.includes('live') && currentIsAudioOutput;
                    let result;
                    if (isLiveModel) {
                        logger.info(`Running Gemini Live API via WebSocket for model: ${modelName}`);
                        const liveRes = await generateContentLive({
                            apiKey: config.geminiApiKey,
                            model: modelName,
                            contents,
                            systemInstruction: systemPrompt,
                            responseModalities: currentIsAudioOutput ? ['AUDIO'] : ['TEXT'],
                            voiceName: 'Puck'
                        });

                        result = {
                            response: {
                                text: () => liveRes.text,
                                candidates: [{
                                    content: {
                                        parts: [
                                            { text: liveRes.text },
                                            ...(liveRes.audioBuffer ? [{
                                                inlineData: {
                                                    mimeType: 'audio/pcm',
                                                    data: liveRes.audioBuffer.toString('base64')
                                                }
                                            }] : [])
                                        ]
                                    }
                                }]
                            }
                        };
                    } else {
                        let attempts = 0;
                        const maxAttempts = 2;
                        while (attempts < maxAttempts) {
                            try {
                                result = await model.generateContent({
                                    contents,
                                    generationConfig
                                });
                                break;
                            } catch (err) {
                                attempts++;
                                const isRateOrServerErr = err.message.includes('503') || err.message.includes('500') || err.message.includes('429');
                                if (isRateOrServerErr && attempts < maxAttempts) {
                                    logger.warn(`Gemini model ${modelName} returned temporary error: ${err.message}. Retrying in 1.5s...`);
                                    await new Promise(resolve => setTimeout(resolve, 1500));
                                } else {
                                    throw err;
                                }
                            }
                        }
                    }

                    const candidate = result.response?.candidates?.[0];
                    const audioPart = candidate?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType.startsWith('audio/'));

                    if (currentIsAudioOutput && audioPart?.inlineData?.data) {
                        audioBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
                        replyText = result.response.text ? result.response.text() : 'أرسلت لك ريكورد بصوتي 🎧';
                        break;
                    } else {
                        const parts = candidate?.content?.parts;
                        if (parts && parts.length > 0) {
                            const textParts = parts.filter(p => !p.thought && p.text);
                            replyText = textParts.length > 0 ? textParts.map(p => p.text).join('') : result.response.text();
                        } else {
                            replyText = result.response.text();
                        }
                        if (replyText) {
                            isAudioOutput = false;
                            break;
                        }
                    }
                } catch (modelErr) {
                    logger.error(`Gemini model ${modelName} failed:`, modelErr.message);
                    if (currentIsAudioOutput) {
                        try {
                            logger.info(`Falling back to text output for model: ${modelName}`);
                            const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
                             let result;
                             let attempts = 0;
                             const maxAttempts = 2;
                             const generationConfig = (() => {
                                 const configObj = { temperature: modelName.includes('gemma') ? 1.0 : 2.0 };
                                 if (supportsThinking) {
                                     if (isGemini3) {
                                         configObj.thinkingConfig = { thinkingLevel: 'minimal' };
                                     } else if (isGemini25) {
                                         configObj.thinkingConfig = { thinkingBudget: 0 };
                                     }
                                 }
                                 return configObj;
                             })();
                             while (attempts < maxAttempts) {
                                 try {
                                     result = await model.generateContent({
                                         contents,
                                         generationConfig
                                     });
                                     break;
                                 } catch (err) {
                                     attempts++;
                                     const isRateOrServerErr = err.message.includes('503') || err.message.includes('500') || err.message.includes('429');
                                     if (isRateOrServerErr && attempts < maxAttempts) {
                                         logger.warn(`Gemini model ${modelName} fallback returned temporary error: ${err.message}. Retrying in 1.5s...`);
                                         await new Promise(resolve => setTimeout(resolve, 1500));
                                     } else {
                                         throw err;
                                     }
                                 }
                             }
                            const fallbackParts = result.response?.candidates?.[0]?.content?.parts;
                            if (fallbackParts && fallbackParts.length > 0) {
                                const textParts = fallbackParts.filter(p => !p.thought && p.text);
                                replyText = textParts.length > 0 ? textParts.map(p => p.text).join('') : result.response.text();
                            } else {
                                replyText = result.response.text();
                            }
                            if (replyText) {
                                isAudioOutput = false;
                                break;
                            }
                        } catch (fallbackErr) {
                            logger.error(`Gemini model ${modelName} text fallback failed:`, fallbackErr.message);
                        }
                    }
                }
            }
        }

        // 2. محاولة استخدام OpenRouter كبديل قوي ومجاني ومستقر (للنصوص فقط)
        if (!replyText && hasOpenRouterKey && !ctx.media) {
            try {
                const models = [
                    'google/gemma-4-31b-it:free'
                ];
                const openRouterMessages = [
                    ...history.map(h => ({
                        role: h.role,
                        content: h.content
                    })),
                    { role: 'user', content: fullQuery }
                ];
                for (const modelName of models) {
                    try {
                        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                            model: modelName,
                            messages: openRouterMessages
                        }, {
                            headers: {
                                'Authorization': `Bearer ${config.openrouterApiKey}`,
                                'Content-Type': 'application/json',
                                'HTTP-Referer': 'https://github.com/Antigravity/Knightbot-MD',
                                'X-Title': 'KnightBot MD'
                            },
                            timeout: 12000
                        });

                        if (response.data?.choices?.[0]?.message) {
                            replyText = response.data.choices[0].message.content;
                            if (replyText) {
                                break;
                            }
                        }
                    } catch (modelErr) {
                        logger.error(`OpenRouter model ${modelName} failed:`, modelErr.response?.data || modelErr.message);
                    }
                }
            } catch (openRouterErr) {
                logger.error('OpenRouter Error:', openRouterErr.message);
            }
        }

        // إرسال الرد للمستخدم
        if (audioBuffer) {
            try {
                const oggBuffer = await transcodeAudioToOpus(audioBuffer);
                const cleanedReply = cleanReasoning(replyText);
                
                addMessageToHistory(ctx.from, 'user', query || '[ريكورد]');
                addMessageToHistory(ctx.from, 'assistant', cleanedReply || '[تسجيل صوتي]');

                await ctx.sock.sendMessage(ctx.from, {
                    audio: oggBuffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true
                }, { quoted: ctx.msg });

                if (cleanedReply && cleanedReply !== 'أرسلت لك ريكورد بصوتي 🎧') {
                    const formatted = formatWhatsApp(cleanedReply);
                    await ctx.reply(`✍️ *تفريغ ريكورد أسترو:*\n\n${formatted}`);
                }
                return;
            } catch (transcodeErr) {
                logger.error('Failed to transcode and send voice note:', transcodeErr);
            }
        }

        if (replyText) {
            const cleanedReply = cleanReasoning(replyText);
            addMessageToHistory(ctx.from, 'user', query || '[وسائط]');
            addMessageToHistory(ctx.from, 'assistant', cleanedReply);
            const formattedReply = formatWhatsApp(cleanedReply);
            await ctx.reply(formattedReply);
        } else {
            return ctx.reply('❌ فشلت خوادم الذكاء الاصطناعي في الاستجابة حالياً. يرجى التحقق من صحة مفتاح الـ API الخاص بك.');
        }

    } catch (e) {
        logger.error(e);
        await ctx.reply('❌ حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي.');
    }
};

registerCommand('ذكاء', askAI, {
    description: 'طرح أسئلة على الذكاء الاصطناعي ChatGPT / Gemini',
    category: '🧠 ذكاء اصطناعي'
});

registerCommand('بوت', askAI, {
    description: 'طرح أسئلة على الذكاء الاصطناعي',
    category: '🧠 ذكاء اصطناعي'
});

// 2. أمر تغيير الشخصية
registerCommand('شخصية', async (ctx) => {
    const chosen = ctx.args[0]?.toLowerCase();

    if (!chosen || !personas[chosen]) {
        let list = `🎭 *شخصيات الذكاء الاصطناعي المتوفرة* 🎭\n\n`;
        for (const [key, p] of Object.entries(personas)) {
            list += `• *${key}* : ${p.name}\n`;
        }
        list += `\n👉 للتفعيل اكتب: *.شخصية [رمز الشخصية]*\n💡 (المشرفون فقط يمكنهم التغيير في المجموعات)`;
        return ctx.reply(list);
    }

    if (ctx.isGroup) {
        const groupMetadata = await ctx.sock.groupMetadata(ctx.from);
        const admins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
        const isSenderAdmin = admins.includes(ctx.sender);

        if (!isSenderAdmin && !ctx.isOwner) {
            return ctx.reply('❌ تغيير شخصية البوت في المجموعة يقتصر على المشرفين فقط!');
        }

        database.updateGroup(ctx.from, { aiPersona: chosen });
        return ctx.reply(`✅ تم تغيير شخصية البوت في المجموعة إلى:\n*${personas[chosen].name}*`);
    } else {
        database.updateUser(ctx.sender, { aiPersona: chosen });
        return ctx.reply(`✅ تم تغيير شخصية البوت الخاصة بك في الدردشة الخاصة إلى:\n*${personas[chosen].name}*`);
    }
}, {
    description: 'تغيير نمط وشخصية ردود البوت الذكية',
    category: '🧠 ذكاء اصطناعي'
});

// 3. أمر تشغيل الرد التلقائي في المجموعات
registerCommand('رد_تلقائي', async (ctx) => {
    const action = ctx.args[0];
    if (!action || (action !== 'تفعيل' && action !== 'تعطيل')) {
        return ctx.reply('⚠️ الرجاء استخدام الأمر كالتالي:\n*.رد_تلقائي تفعيل* (لتشغيل الرد التلقائي عند المنشن)\n*.رد_تلقائي تعطيل* (لإيقاف الرد التلقائي)');
    }

    if (!ctx.isGroup) {
        return ctx.reply('❌ هذا الأمر يمكن استخدامه في المجموعات فقط!');
    }

    const groupMetadata = await ctx.sock.groupMetadata(ctx.from);
    const admins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
    const isSenderAdmin = admins.includes(ctx.sender);

    if (!isSenderAdmin && !ctx.isOwner) {
        return ctx.reply('❌ تشغيل الرد التلقائي يقتصر على مشرفي المجموعة فقط!');
    }

    const isEnable = action === 'تفعيل';
    database.updateGroup(ctx.from, { autoReply: isEnable });
    await ctx.reply(`🛡️ تم *${action}* نظام الرد التلقائي بالذكاء الاصطناعي بنجاح في هذه المجموعة.`);
}, {
    description: 'تفعيل أو تعطيل الرد التلقائي بالذكاء الاصطناعي عند المنشن في المجموعة',
    category: '🧠 ذكاء اصطناعي',
    groupOnly: true
});

registerCommand('ردتلقائي', async (ctx) => {
    const cmd = commands.get('رد_تلقائي');
    if (cmd) await cmd.execute(ctx);
}, {
    description: 'تفعيل أو تعطيل الرد التلقائي بالذكاء الاصطناعي',
    category: '🧠 ذكاء اصطناعي',
    groupOnly: true
});
