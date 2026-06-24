// 📝 نظام تسجيل موحد لـ KnightBot MD v2.0
// يدعم المستويات + حفظ في ملف + تصفية حسب LOG_LEVEL

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const levels = { debug: 10, info: 20, success: 25, warn: 30, error: 40 };

// مجلد السجلات
const logsDir = path.resolve('./data/logs');
if (!fs.existsSync(logsDir)) {
    try { fs.mkdirSync(logsDir, { recursive: true }); } catch (_) {}
}

const logFilePath = path.join(logsDir, `bot_${new Date().toISOString().split('T')[0]}.log`);

// تتبع أحجام السجل لتدويره
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 ميجابايت
function rotateLogIfNeeded() {
    try {
        if (!fs.existsSync(logFilePath)) return;
        const stats = fs.statSync(logFilePath);
        if (stats.size > MAX_LOG_SIZE) {
            const backup = logFilePath.replace('.log', `_${Date.now()}.log`);
            fs.renameSync(logFilePath, backup);
        }
    } catch (_) {}
}

function appendLog(line) {
    try {
        rotateLogIfNeeded();
        fs.appendFileSync(logFilePath, line + '\n', 'utf-8');
    } catch (_) { /* تجاهل أخطاء السجل */ }
}

function shouldLog(level) {
    return (levels[level] || 0) >= (levels[logLevel] || 0);
}

function timestamp() {
    return new Date().toLocaleTimeString('ar-EG', { hour12: false });
}

function fullTimestamp() {
    return new Date().toISOString();
}

export const logger = {
    debug: (msg, ...args) => {
        if (!shouldLog('debug')) return;
        const line = `[${timestamp()}] [DEBUG] ${msg}`;
        console.log(chalk.gray(line));
        if (args.length) console.log(chalk.gray(JSON.stringify(args)));
        appendLog(`[${fullTimestamp()}] [DEBUG] ${msg}${args.length ? ' ' + JSON.stringify(args) : ''}`);
    },

    info: (msg, ...args) => {
        if (!shouldLog('info')) return;
        const line = `[${timestamp()}] [INFO] ${msg}`;
        console.log(chalk.blue(line));
        if (args.length) console.log(args);
        appendLog(`[${fullTimestamp()}] [INFO] ${msg}${args.length ? ' ' + safeStringify(args) : ''}`);
    },

    success: (msg, ...args) => {
        if (!shouldLog('success')) return;
        const line = `[${timestamp()}] [SUCCESS] ${msg}`;
        console.log(chalk.green(line));
        if (args.length) console.log(args);
        appendLog(`[${fullTimestamp()}] [SUCCESS] ${msg}${args.length ? ' ' + safeStringify(args) : ''}`);
    },

    warn: (msg, ...args) => {
        if (!shouldLog('warn')) return;
        const line = `[${timestamp()}] [WARN] ${msg}`;
        console.log(chalk.yellow(line));
        if (args.length) console.log(args);
        appendLog(`[${fullTimestamp()}] [WARN] ${msg}${args.length ? ' ' + safeStringify(args) : ''}`);
    },

    error: (msg, err = '') => {
        if (!shouldLog('error')) return;
        const line = `[${timestamp()}] [ERROR] ${msg}`;
        console.log(chalk.red(line));
        if (err) console.error(err);
        const errStr = err instanceof Error
            ? `${err.message}\n${err.stack || ''}`
            : (typeof err === 'string' ? err : safeStringify(err));
        appendLog(`[${fullTimestamp()}] [ERROR] ${msg}${errStr ? ' ' + errStr : ''}`);
    },

    // مسار ملف السجل الحالي (لأمر الإحصائيات)
    getLogPath: () => logFilePath
};

function safeStringify(obj) {
    try {
        if (obj instanceof Error) return obj.message + ' ' + (obj.stack || '');
        return JSON.stringify(obj);
    } catch (_) {
        return String(obj);
    }
}
