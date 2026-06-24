import WebSocket from 'ws';
import { logger } from './logger.js';

/**
 * يقوم بالاتصال بخدمة Gemini Live API عبر الـ WebSocket لتوليد المحتوى
 * @param {object} params
 * @param {string} params.apiKey
 * @param {string} params.model
 * @param {array} params.contents
 * @param {string} params.systemInstruction
 * @param {array} params.responseModalities
 * @param {string} params.voiceName
 * @returns {Promise<{text: string, audioBuffer: Buffer|null}>}
 */
export async function generateContentLive({
    apiKey,
    model = 'models/gemini-3.1-flash-live-preview',
    contents,
    systemInstruction,
    responseModalities = ['TEXT'],
    voiceName = 'Puck'
}) {
    return new Promise((resolve, reject) => {
        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        const ws = new WebSocket(url);
        
        let replyText = '';
        const audioChunks = [];
        let isResolved = false;

        const safeResolve = (val) => {
            if (!isResolved) {
                isResolved = true;
                resolve(val);
            }
        };

        const safeReject = (err) => {
            if (!isResolved) {
                isResolved = true;
                reject(err);
            }
        };

        ws.on('open', () => {
            logger.info(`🔌 [Live API] Connection opened for model: ${model}`);
            
            // 1. إرسال رسالة الإعداد (Setup Message)
            const setupMessage = {
                setup: {
                    model: model.startsWith('models/') ? model : `models/${model}`,
                    generationConfig: {
                        responseModalities,
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName
                                }
                            }
                        }
                    },
                    systemInstruction: systemInstruction ? {
                        parts: [{ text: systemInstruction }]
                    } : undefined
                }
            };
            ws.send(JSON.stringify(setupMessage));

            // 2. إرسال المحتوى والسياق مباشرة بعد الإعداد
            // نقوم بتهيئة الأدوار لتبدو كـ user و model
            const turns = contents.map(turn => ({
                role: turn.role === 'model' ? 'model' : 'user',
                parts: turn.parts.map(part => {
                    if (part.text) return { text: part.text };
                    if (part.inlineData) return { inlineData: part.inlineData };
                    return part;
                })
            }));

            const clientContentMessage = {
                clientContent: {
                    turns,
                    turnComplete: true
                }
            };
            ws.send(JSON.stringify(clientContentMessage));
        });

        ws.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString());
                
                // تجميع النص والصوت من المخرجات
                if (response.serverContent?.modelTurn?.parts) {
                    for (const part of response.serverContent.modelTurn.parts) {
                        if (part.text) {
                            replyText += part.text;
                        }
                        if (part.inlineData?.data) {
                            const buffer = Buffer.from(part.inlineData.data, 'base64');
                            audioChunks.push(buffer);
                        }
                    }
                }

                // عند انتهاء المحادثة أو إرسال الاستجابة بالكامل
                if (response.serverContent?.turnComplete) {
                    ws.close();
                    safeResolve({
                        text: replyText,
                        audioBuffer: audioChunks.length > 0 ? Buffer.concat(audioChunks) : null
                    });
                }
            } catch (err) {
                logger.error('❌ [Live API] Error parsing message:', err.message);
            }
        });

        ws.on('error', (err) => {
            logger.error('❌ [Live API] WebSocket Error:', err.message);
            safeReject(err);
        });

        ws.on('close', (code, reason) => {
            logger.info(`🔌 [Live API] Connection closed. Code: ${code}, Reason: ${reason}`);
            safeResolve({
                text: replyText,
                audioBuffer: audioChunks.length > 0 ? Buffer.concat(audioChunks) : null
            });
        });

        // مهلة اتصال قصوى لمنع التعليق (30 ثانية)
        setTimeout(() => {
            if (!isResolved) {
                logger.warn('⏳ [Live API] Connection timeout reached.');
                try {
                    ws.close();
                } catch {}
                safeResolve({
                    text: replyText,
                    audioBuffer: audioChunks.length > 0 ? Buffer.concat(audioChunks) : null
                });
            }
        }, 30000);
    });
}
