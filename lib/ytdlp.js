import youtubeDlExec from 'youtube-dl-exec';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import { logger } from './logger.js';

// إدراج مجلد ffmpeg في PATH لكي يتمكن yt-dlp من إيجاده
const ffmpegDir = path.dirname(path.resolve(ffmpegPath));
if (!process.env.PATH.includes(ffmpegDir)) {
    process.env.PATH = `${ffmpegDir}${path.delimiter}${process.env.PATH}`;
}

const tempDir = './data/temp';
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * جلب معلومات الفيديو (العنوان، المدة، إلخ) بدون تحميل
 * مفيد للفحص المسبق للطول قبل التحميل الكامل
 * @param {string} url
 * @returns {Promise<{title: string, duration: number, thumbnail: string, uploader: string} | null>}
 */
export async function getInfo(url) {
    try {
        const result = await youtubeDlExec(url, {
            dumpJson: true,
            noPlaylist: true,
            noWarnings: true,
            skipDownload: true
        });
        if (result && typeof result === 'object') {
            return {
                title: result.title || 'Media',
                duration: result.duration || 0,
                thumbnail: result.thumbnail || '',
                uploader: result.uploader || result.channel || '',
                ext: result.ext || 'mp4'
            };
        }
        return null;
    } catch (e) {
        logger.error(`فشل جلب معلومات الرابط ${url}:`, e.message);
        return null;
    }
}

/**
 * تحميل فيديو أو صوت من أي منصة مدعومة بواسطة yt-dlp
 * @param {string} url رابط الفيديو
 * @param {object} opts خيارات إضافية
 * @param {boolean} opts.audioOnly تحميل صوت فقط
 * @param {string} opts.format صيغة محددة (اختياري)
 * @returns {Promise<{success: boolean, buffer?: Buffer, title?: string, duration?: number, ext?: string, error?: string}>}
 */
export async function downloadMedia(url, opts = {}) {
    const timestamp = Date.now();
    const outputTemplate = path.join(tempDir, `dl_${timestamp}.%(ext)s`);
    const infoFile = path.join(tempDir, `dl_${timestamp}.info.json`);

    try {
        const ytdlpOpts = {
            output: outputTemplate,
            writeInfoJson: true,
            noPlaylist: true,
            noCheckCertificates: true,
            preferFreeFormats: false,
            noWarnings: true
        };

        if (opts.audioOnly) {
            ytdlpOpts.extractAudio = true;
            ytdlpOpts.audioFormat = 'mp3';
        }

        // تشغيل yt-dlp
        await youtubeDlExec(url, ytdlpOpts);

        // قراءة ملف المعلومات
        let title = 'Media';
        let duration = 0;
        let ext = opts.audioOnly ? 'mp3' : 'mp4';

        if (fs.existsSync(infoFile)) {
            try {
                const info = JSON.parse(fs.readFileSync(infoFile, 'utf-8'));
                title = info.title || title;
                duration = info.duration || 0;
                ext = opts.audioOnly ? 'mp3' : (info.ext || ext);
            } catch (e) {
                logger.error('فشل قراءة info.json:', e.message);
            }
            try { fs.unlinkSync(infoFile); } catch (_) {}
        }

        // البحث عن ملف الإخراج
        const outputFile = path.join(tempDir, `dl_${timestamp}.${ext}`);

        let actualFile = outputFile;
        if (!fs.existsSync(actualFile)) {
            const files = fs.readdirSync(tempDir).filter(f => f.startsWith(`dl_${timestamp}.`));
            if (files.length > 0) {
                actualFile = path.join(tempDir, files[0]);
            } else {
                return { success: false, error: 'ملف الإخراج غير موجود بعد التحميل' };
            }
        }

        const buffer = fs.readFileSync(actualFile);
        // تنظيف الملف المؤقت
        try { fs.unlinkSync(actualFile); } catch (_) {}

        return { success: true, buffer, title, duration, ext };

    } catch (e) {
        // تنظيف الملفات المؤقتة في حال الخطأ
        try {
            const files = fs.readdirSync(tempDir).filter(f => f.startsWith(`dl_${timestamp}`));
            files.forEach(f => fs.unlinkSync(path.join(tempDir, f)));
        } catch (_) {}

        return { success: false, error: e.stderr || e.message || String(e) };
    }
}
