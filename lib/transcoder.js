import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

// تحديد مسار ثنائي ffmpeg المنسوخ لتجنب مشكلة قفل الملفات (EBUSY) على نظام ويندوز
const tempDir = './data/temp';
const copiedFfmpegPath = path.join(tempDir, 'ffmpeg.exe');

// التأكد من تهيئة مجلد المخرجات ومحرك ffmpeg
const initializeFfmpeg = () => {
    try {
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        // نسخ الملف إذا لم يكن موجوداً لتسريع البدء اللاحق
        if (fs.existsSync(ffmpegPath)) {
            fs.copyFileSync(ffmpegPath, copiedFfmpegPath);
            ffmpeg.setFfmpegPath(copiedFfmpegPath);
        } else {
            ffmpeg.setFfmpegPath(ffmpegPath);
        }
    } catch (e) {
        logger.error('فشل تهيئة ffmpeg المحلي:', e.message);
        ffmpeg.setFfmpegPath(ffmpegPath);
    }
};

initializeFfmpeg();

/**
 * تحويل ترميز الفيديو ومعالجته ليكون متوافقاً 100% مع تشغيل واتساب المباشر
 * @param {Buffer} inputBuffer بافر الفيديو الأصلي
 * @returns {Promise<Buffer>} بافر الفيديو بعد إعادة الترميز بـ H.264 و AAC
 */
export const transcodeToWhatsApp = async (inputBuffer) => {
    return new Promise(async (resolve, reject) => {
        const timestamp = Date.now();
        const inputPath = path.join(tempDir, `input_${timestamp}.mp4`);
        const outputPath = path.join(tempDir, `output_${timestamp}.mp4`);

        try {
            await fs.promises.writeFile(inputPath, inputBuffer);

            ffmpeg(inputPath)
                .outputOptions([
                    '-c:v libx264',         // ترميز الفيديو H.264 المدعوم في واتساب
                    '-profile:v high',      // مستوى التوافق العالي
                    '-level:v 4.0',
                    '-pix_fmt yuv420p',     // نظام الألوان القياسي لتشغيل واتساب
                    '-c:a aac',             // ترميز الصوت AAC القياسي
                    '-movflags +faststart', // لبدء تشغيل الفيديو مباشرة أثناء التحميل
                    '-preset superfast'     // تسريع عملية المعالجة وتوفير وقت الخادم
                ])
                .save(outputPath)
                .on('end', async () => {
                    try {
                        const outputBuffer = await fs.promises.readFile(outputPath);
                        // تنظيف الملفات المؤقتة فوراً
                        await fs.promises.unlink(inputPath).catch(() => {});
                        await fs.promises.unlink(outputPath).catch(() => {});
                        resolve(outputBuffer);
                    } catch (readErr) {
                        reject(readErr);
                    }
                })
                .on('error', async (err) => {
                    // تنظيف الملفات المؤقتة في حالة الخطأ
                    await fs.promises.unlink(inputPath).catch(() => {});
                    await fs.promises.unlink(outputPath).catch(() => {});
                    reject(err);
                });
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * تحويل ترميز الصوت (PCM أو WAV) إلى Opus OGG ليعمل كـ ريكورد في واتساب
 * @param {Buffer} inputBuffer بافر الصوت الأصلي
 * @returns {Promise<Buffer>} بافر الصوت بصيغة OGG Opus
 */
export const transcodeAudioToOpus = async (inputBuffer) => {
    return new Promise(async (resolve, reject) => {
        const timestamp = Date.now();
        const inputPath = path.join(tempDir, `input_audio_${timestamp}.wav`);
        const outputPath = path.join(tempDir, `output_audio_${timestamp}.ogg`);

        try {
            await fs.promises.writeFile(inputPath, inputBuffer);

            // التحقق من وجود هيدر الـ WAV (أول 4 بايت تحتوي على "RIFF")
            const isWav = inputBuffer.slice(0, 4).toString() === 'RIFF';

            let command = ffmpeg(inputPath);
            if (!isWav) {
                // إذا كان خام PCM (s16le, 24kHz, mono)
                command = command.inputOptions([
                    '-f s16le',
                    '-ar 24000',
                    '-ac 1'
                ]);
            }

            command
                .outputOptions([
                    '-c:a libopus',
                    '-ac 1',
                    '-ar 16000'
                ])
                .save(outputPath)
                .on('end', async () => {
                    try {
                        const outputBuffer = await fs.promises.readFile(outputPath);
                        await fs.promises.unlink(inputPath).catch(() => {});
                        await fs.promises.unlink(outputPath).catch(() => {});
                        resolve(outputBuffer);
                    } catch (readErr) {
                        reject(readErr);
                    }
                })
                .on('error', async (err) => {
                    await fs.promises.unlink(inputPath).catch(() => {});
                    await fs.promises.unlink(outputPath).catch(() => {});
                    reject(err);
                });
        } catch (e) {
            reject(e);
        }
    });
};
