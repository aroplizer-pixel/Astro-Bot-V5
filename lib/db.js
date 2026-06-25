// 💾 قاعدة بيانات SQLite لـ KnightBot MD v2.0
// سريعة، آمنة، ومتزامنة (better-sqlite3)
// تحافظ على نفس الواجهة القديمة لتفادي كسر الإضافات

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';
import { runMigrationIfNeeded } from './migrate.js';

const dataDir = path.resolve('./data');
const backupDir = path.resolve('./data/backup');
const dbPath = path.resolve('./data/database.db');

// التأكد من وجود المجلدات
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// ──────────────────────────────────────────────────────────────
// تشغيل الترحيل من JSON إلى SQLite إن وجد ملف قديم
// ──────────────────────────────────────────────────────────────
runMigrationIfNeeded();

// ──────────────────────────────────────────────────────────────
// فتح قاعدة البيانات مع إعدادات الأداء
// ──────────────────────────────────────────────────────────────
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');      // أداء أعلى للكتابة المتزامنة
db.pragma('synchronous = NORMAL');    // توازن بين السرعة والأمان
db.pragma('foreign_keys = ON');

// ──────────────────────────────────────────────────────────────
// إنشاء الجداول إن لم تكن موجودة
// ──────────────────────────────────────────────────────────────
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        jid TEXT PRIMARY KEY,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        wallet INTEGER DEFAULT 100,
        bank INTEGER DEFAULT 0,
        lastDaily INTEGER DEFAULT 0,
        warnings INTEGER DEFAULT 0,
        shield INTEGER DEFAULT 0,
        title TEXT,
        partner TEXT,
        clan TEXT,
        inventory TEXT DEFAULT '[]',
        aiPersona TEXT DEFAULT 'default',
        health INTEGER DEFAULT 100,
        maxHealth INTEGER DEFAULT 100,
        attack INTEGER DEFAULT 10,
        defense INTEGER DEFAULT 5,
        rank TEXT DEFAULT 'مبتدئ',
        lastWork INTEGER DEFAULT 0,
        lastMine INTEGER DEFAULT 0,
        lastCrime INTEGER DEFAULT 0,
        lastFight INTEGER DEFAULT 0,
        stocks TEXT DEFAULT '{}',
        gems INTEGER DEFAULT 0,
        class TEXT DEFAULT 'بدون',
        weaponLevel INTEGER DEFAULT 0,
        lastBossAttack INTEGER DEFAULT 0,
        extra TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS groups (
        jid TEXT PRIMARY KEY,
        antiLink INTEGER DEFAULT 0,
        antiSpam INTEGER DEFAULT 0,
        antiBadwords INTEGER DEFAULT 0,
        antiDelete INTEGER DEFAULT 0,
        autoAdhkar INTEGER DEFAULT 0,
        welcome INTEGER DEFAULT 1,
        welcomeMessage TEXT DEFAULT 'مرحباً بك يا @user في المجموعة! 👋',
        goodbyeMessage TEXT DEFAULT 'وداعاً يا @user.. 🥺',
        aiPersona TEXT DEFAULT 'default',
        autoReply INTEGER DEFAULT 0,
        extra TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS clans (
        name TEXT PRIMARY KEY,
        leader TEXT NOT NULL,
        members TEXT DEFAULT '[]',
        treasury INTEGER DEFAULT 0,
        extra TEXT DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);
    CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet);
    CREATE INDEX IF NOT EXISTS idx_users_clan ON users(clan);
    CREATE INDEX IF NOT EXISTS idx_clans_leader ON clans(leader);
`);

// ──────────────────────────────────────────────────────────────
// ترحيل الأعمدة الجديدة تلقائياً إذا كانت قاعدة البيانات منشأة مسبقاً
// ──────────────────────────────────────────────────────────────
const newColumns = [
    { name: 'health', type: 'INTEGER DEFAULT 100' },
    { name: 'maxHealth', type: 'INTEGER DEFAULT 100' },
    { name: 'attack', type: 'INTEGER DEFAULT 10' },
    { name: 'defense', type: 'INTEGER DEFAULT 5' },
    { name: 'rank', type: "TEXT DEFAULT 'مبتدئ'" },
    { name: 'lastWork', type: 'INTEGER DEFAULT 0' },
    { name: 'lastMine', type: 'INTEGER DEFAULT 0' },
    { name: 'lastCrime', type: 'INTEGER DEFAULT 0' },
    { name: 'lastFight', type: 'INTEGER DEFAULT 0' },
    { name: 'stocks', type: "TEXT DEFAULT '{}'" },
    { name: 'gems', type: 'INTEGER DEFAULT 0' },
    { name: 'class', type: "TEXT DEFAULT 'بدون'" },
    { name: 'weaponLevel', type: 'INTEGER DEFAULT 0' },
    { name: 'lastBossAttack', type: 'INTEGER DEFAULT 0' }
];

for (const col of newColumns) {
    try {
        db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
    } catch (_) {
        // العمود مضاف مسبقاً
    }
}

const newGroupColumns = [
    { name: 'autoReply', type: 'INTEGER DEFAULT 0' }
];

for (const col of newGroupColumns) {
    try {
        db.exec(`ALTER TABLE groups ADD COLUMN ${col.name} ${col.type}`);
    } catch (_) {
        // العمود مضاف مسبقاً
    }
}

// تنظيف قاعدة البيانات من أي معرفات مشوهة مسبقاً وعمل دمج للحسابات المكررة
try {
    const users = db.prepare('SELECT * FROM users').all();
    const cleanJidLocal = (jid) => {
        if (!jid || typeof jid !== 'string') return jid;
        const [userPart, domain] = jid.split('@');
        const cleanUser = userPart.split(':')[0];
        const cleanDomain = domain || 's.whatsapp.net';
        return `${cleanUser}@${cleanDomain}`;
    };
    
    db.transaction(() => {
        for (const user of users) {
            const cleanUserJid = cleanJidLocal(user.jid);
            const cleanPartner = user.partner ? cleanJidLocal(user.partner) : null;
            if (cleanUserJid !== user.jid || cleanPartner !== user.partner) {
                if (cleanUserJid !== user.jid) {
                    const existingUser = db.prepare('SELECT * FROM users WHERE jid = ?').get(cleanUserJid);
                    if (existingUser) {
                        // دمج النقود والخبرة وحذف السجل المكرر القديم
                        db.prepare(`
                            UPDATE users SET 
                                xp = xp + ?, 
                                wallet = wallet + ?,
                                partner = ?
                            WHERE jid = ?
                        `).run(user.xp, user.wallet, cleanPartner || existingUser.partner, cleanUserJid);
                        db.prepare('DELETE FROM users WHERE jid = ?').run(user.jid);
                    } else {
                        db.prepare('UPDATE users SET jid = ?, partner = ? WHERE jid = ?').run(cleanUserJid, cleanPartner, user.jid);
                    }
                } else {
                    db.prepare('UPDATE users SET partner = ? WHERE jid = ?').run(cleanPartner, user.jid);
                }
            }
        }
    })();
    logger.info('🧹 تم تنظيف وتنسيق معرفات قاعدة البيانات بنجاح!');
} catch (err) {
    logger.error('خطأ أثناء تنظيف قاعدة البيانات:', err);
}

// ──────────────────────────────────────────────────────────────
// Prepared Statements للأداء العالي (تُحضّر مرة واحدة)
// ──────────────────────────────────────────────────────────────
const stmts = {
    getUser: db.prepare('SELECT * FROM users WHERE jid = ?'),
    insertUser: db.prepare(`
        INSERT INTO users (jid) VALUES (@jid)
        ON CONFLICT(jid) DO NOTHING
    `),
    updateUser: db.prepare(`
        UPDATE users SET
            xp = @xp, level = @level, wallet = @wallet, bank = @bank,
            lastDaily = @lastDaily, warnings = @warnings, shield = @shield,
            title = @title, partner = @partner, clan = @clan,
            inventory = @inventory, aiPersona = @aiPersona,
            health = @health, maxHealth = @maxHealth, attack = @attack,
            defense = @defense, rank = @rank, lastWork = @lastWork,
            lastMine = @lastMine, lastCrime = @lastCrime, lastFight = @lastFight,
            stocks = @stocks, gems = @gems, class = @class, weaponLevel = @weaponLevel,
            lastBossAttack = @lastBossAttack, extra = @extra
        WHERE jid = @jid
    `),
    deleteUser: db.prepare('DELETE FROM users WHERE jid = ?'),

    getGroup: db.prepare('SELECT * FROM groups WHERE jid = ?'),
    insertGroup: db.prepare(`
        INSERT INTO groups (jid) VALUES (@jid)
        ON CONFLICT(jid) DO NOTHING
    `),
    updateGroup: db.prepare(`
        UPDATE groups SET
            antiLink = @antiLink, antiSpam = @antiSpam, antiBadwords = @antiBadwords,
            antiDelete = @antiDelete, autoAdhkar = @autoAdhkar, welcome = @welcome,
            welcomeMessage = @welcomeMessage, goodbyeMessage = @goodbyeMessage,
            aiPersona = @aiPersona, autoReply = @autoReply, extra = @extra
        WHERE jid = @jid
    `),

    getClan: db.prepare('SELECT * FROM clans WHERE name = ?'),
    insertClan: db.prepare(`
        INSERT INTO clans (name, leader, members, treasury, extra)
        VALUES (@name, @leader, @members, @treasury, @extra)
    `),
    updateClan: db.prepare(`
        UPDATE clans SET
            leader = @leader, members = @members, treasury = @treasury, extra = @extra
        WHERE name = @name
    `),
    deleteClan: db.prepare('DELETE FROM clans WHERE name = ?'),

    // إحصائيات سريعة
    countUsers: db.prepare('SELECT COUNT(*) as count FROM users'),
    countGroups: db.prepare('SELECT COUNT(*) as count FROM groups'),
    topUsersByWallet: db.prepare('SELECT jid, wallet FROM users ORDER BY wallet DESC LIMIT ?'),
    topUsersByLevel: db.prepare('SELECT jid, level, xp FROM users ORDER BY level DESC, xp DESC LIMIT ?'),
};

// ──────────────────────────────────────────────────────────────
// دوال تحويل الصفوف إلى كائنات JS (مع تحويل الأعمدة JSON)
// ──────────────────────────────────────────────────────────────
function rowToUser(row) {
    if (!row) return null;
    return {
        jid: row.jid,
        xp: row.xp,
        level: row.level,
        wallet: row.wallet,
        bank: row.bank,
        lastDaily: row.lastDaily,
        warnings: row.warnings,
        shield: row.shield,
        title: row.title,
        partner: row.partner,
        clan: row.clan,
        inventory: JSON.parse(row.inventory || '[]'),
        aiPersona: row.aiPersona,
        health: row.health ?? 100,
        maxHealth: row.maxHealth ?? 100,
        attack: row.attack ?? 10,
        defense: row.defense ?? 5,
        rank: row.rank || 'مبتدئ',
        lastWork: row.lastWork ?? 0,
        lastMine: row.lastMine ?? 0,
        lastCrime: row.lastCrime ?? 0,
        lastFight: row.lastFight ?? 0,
        stocks: JSON.parse(row.stocks || '{}'),
        gems: row.gems ?? 0,
        class: row.class || 'بدون',
        weaponLevel: row.weaponLevel ?? 0,
        lastBossAttack: row.lastBossAttack ?? 0,
        ...JSON.parse(row.extra || '{}')
    };
}

function rowToGroup(row) {
    if (!row) return null;
    return {
        jid: row.jid,
        antiLink: !!row.antiLink,
        antiSpam: !!row.antiSpam,
        antiBadwords: !!row.antiBadwords,
        antiDelete: !!row.antiDelete,
        autoAdhkar: !!row.autoAdhkar,
        welcome: !!row.welcome,
        welcomeMessage: row.welcomeMessage,
        goodbyeMessage: row.goodbyeMessage,
        aiPersona: row.aiPersona,
        autoReply: !!row.autoReply,
        ...JSON.parse(row.extra || '{}')
    };
}

function rowToClan(row) {
    if (!row) return null;
    return {
        name: row.name,
        leader: row.leader,
        members: JSON.parse(row.members || '[]'),
        treasury: row.treasury,
        ...JSON.parse(row.extra || '{}')
    };
}

// ──────────────────────────────────────────────────────────────
// الأعمدة المعروفة لكل جدول (للفصل بينها وبين extras)
// ──────────────────────────────────────────────────────────────
const USER_COLUMNS = new Set([
    'jid', 'xp', 'level', 'wallet', 'bank', 'lastDaily', 'warnings', 'shield',
    'title', 'partner', 'clan', 'inventory', 'aiPersona',
    'health', 'maxHealth', 'attack', 'defense', 'rank',
    'lastWork', 'lastMine', 'lastCrime', 'lastFight', 'stocks',
    'gems', 'class', 'weaponLevel', 'lastBossAttack'
]);
const GROUP_COLUMNS = new Set(['jid', 'antiLink', 'antiSpam', 'antiBadwords', 'antiDelete', 'autoAdhkar', 'welcome', 'welcomeMessage', 'goodbyeMessage', 'aiPersona', 'autoReply']);
const CLAN_COLUMNS = new Set(['name', 'leader', 'members', 'treasury']);

function splitExtras(data, knownCols, defaults = {}) {
    const main = { ...defaults };
    const extra = {};
    for (const [key, value] of Object.entries(data)) {
        if (knownCols.has(key)) {
            main[key] = value;
        } else {
            extra[key] = value;
        }
    }
    return { main, extra };
}

function cleanJid(jid) {
    if (!jid || typeof jid !== 'string') return jid;
    const [userPart, domain] = jid.split('@');
    const cleanUser = userPart.split(':')[0];
    const cleanDomain = domain || 's.whatsapp.net';
    return `${cleanUser}@${cleanDomain}`;
}

// ──────────────────────────────────────────────────────────────
// واجهة قاعدة البيانات (متوافقة مع النسخة القديمة)
// ──────────────────────────────────────────────────────────────
export const database = {
    // ════════════ إدارة المستخدمين ════════════
    getUser: (jid) => {
        const cleaned = cleanJid(jid);
        stmts.insertUser.run({ jid: cleaned });
        const row = stmts.getUser.get(cleaned);
        return rowToUser(row);
    },

    updateUser: (jid, data) => {
        const cleaned = cleanJid(jid);
        const current = database.getUser(cleaned);
        const merged = { ...current, ...data };

        const { main, extra } = splitExtras(merged, USER_COLUMNS, {
            xp: 0, level: 1, wallet: 100, bank: 0, lastDaily: 0,
            warnings: 0, shield: 0, title: null, partner: null,
            clan: null, inventory: '[]', aiPersona: 'default',
            health: 100, maxHealth: 100, attack: 10, defense: 5, rank: 'مبتدئ',
            lastWork: 0, lastMine: 0, lastCrime: 0, lastFight: 0, stocks: '{}',
            gems: 0, class: 'بدون', weaponLevel: 0, lastBossAttack: 0
        });

        if (main.partner) {
            main.partner = cleanJid(main.partner);
        }

        stmts.updateUser.run({
            jid: cleaned,
            xp: main.xp ?? 0,
            level: main.level ?? 1,
            wallet: main.wallet ?? 0,
            bank: main.bank ?? 0,
            lastDaily: main.lastDaily ?? 0,
            warnings: main.warnings ?? 0,
            shield: main.shield ?? 0,
            title: main.title,
            partner: main.partner,
            clan: main.clan,
            inventory: JSON.stringify(main.inventory || []),
            aiPersona: main.aiPersona || 'default',
            health: main.health ?? 100,
            maxHealth: main.maxHealth ?? 100,
            attack: main.attack ?? 10,
            defense: main.defense ?? 5,
            rank: main.rank || 'مبتدئ',
            lastWork: main.lastWork ?? 0,
            lastMine: main.lastMine ?? 0,
            lastCrime: main.lastCrime ?? 0,
            lastFight: main.lastFight ?? 0,
            stocks: typeof main.stocks === 'string' ? main.stocks : JSON.stringify(main.stocks || {}),
            gems: main.gems ?? 0,
            class: main.class || 'بدون',
            weaponLevel: main.weaponLevel ?? 0,
            lastBossAttack: main.lastBossAttack ?? 0,
            extra: JSON.stringify({ ...(current?.extra || {}), ...extra })
        });

        return database.getUser(cleaned);
    },

    deleteUser: (jid) => {
        const cleaned = cleanJid(jid);
        stmts.deleteUser.run(cleaned);
    },

    // ════════════ إدارة المجموعات ════════════
    getGroup: (jid) => {
        stmts.insertGroup.run({ jid });
        const row = stmts.getGroup.get(jid);
        return rowToGroup(row);
    },

    updateGroup: (jid, data) => {
        const current = database.getGroup(jid);
        const merged = { ...current, ...data };

        const { main, extra } = splitExtras(merged, GROUP_COLUMNS, {
            antiLink: 0, antiSpam: 0, antiBadwords: 0, antiDelete: 0,
            autoAdhkar: 0, welcome: 1,
            welcomeMessage: 'مرحباً بك يا @user في المجموعة! 👋',
            goodbyeMessage: 'وداعاً يا @user.. 🥺',
            aiPersona: 'default',
            autoReply: 0
        });

        stmts.updateGroup.run({
            jid,
            antiLink: main.antiLink ? 1 : 0,
            antiSpam: main.antiSpam ? 1 : 0,
            antiBadwords: main.antiBadwords ? 1 : 0,
            antiDelete: main.antiDelete ? 1 : 0,
            autoAdhkar: main.autoAdhkar ? 1 : 0,
            welcome: main.welcome ? 1 : 0,
            welcomeMessage: main.welcomeMessage,
            goodbyeMessage: main.goodbyeMessage,
            aiPersona: main.aiPersona || 'default',
            autoReply: main.autoReply ? 1 : 0,
            extra: JSON.stringify({ ...(current?.extra || {}), ...extra })
        });

        return database.getGroup(jid);
    },

    // ════════════ إدارة التحالفات (Clans) ════════════
    getClan: (name) => {
        const row = stmts.getClan.get(name);
        return rowToClan(row);
    },

    createClan: (name, leaderJid) => {
        stmts.insertClan.run({
            name,
            leader: leaderJid,
            members: JSON.stringify([leaderJid]),
            treasury: 0,
            extra: '{}'
        });
        return database.getClan(name);
    },

    updateClan: (name, data) => {
        const current = database.getClan(name);
        if (!current) return null;

        const merged = { ...current, ...data };
        const { main, extra } = splitExtras(merged, CLAN_COLUMNS, {
            leader: current.leader, members: '[]', treasury: 0
        });

        stmts.updateClan.run({
            name,
            leader: main.leader,
            members: JSON.stringify(main.members || []),
            treasury: main.treasury ?? 0,
            extra: JSON.stringify({ ...(current?.extra || {}), ...extra })
        });

        return database.getClan(name);
    },

    deleteClan: (name) => {
        const info = stmts.deleteClan.run(name);
        return info.changes > 0;
    },

    // ════════════ الإحصائيات ════════════
    stats: {
        userCount: () => stmts.countUsers.get().count,
        groupCount: () => stmts.countGroups.get().count,
        topWallet: (limit = 10) => stmts.topUsersByWallet.all(limit).map(r => ({ jid: r.jid, wallet: r.wallet })),
        topLevel: (limit = 10) => stmts.topUsersByLevel.all(limit).map(r => ({ jid: r.jid, level: r.level, xp: r.xp })),
    },

    // ════════════ أدوات مساعدة ════════════
    backup: () => {
        const backupPath = path.join(backupDir, `database_${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
        db.backup(backupPath)
            .then(() => logger.info(`💾 تم إنشاء نسخة احتياطية: ${backupPath}`))
            .catch(err => logger.error('فشل إنشاء النسخة الاحتياطية:', err));
    },

    close: () => db.close()
};

// ──────────────────────────────────────────────────────────────
// نسخ احتياطي يومي تلقائي
// ──────────────────────────────────────────────────────────────
let lastBackupDay = new Date().toDateString();
setInterval(() => {
    const today = new Date().toDateString();
    if (today !== lastBackupDay) {
        lastBackupDay = today;
        database.backup();
    }
}, 60 * 60 * 1000); // فحص كل ساعة

// الاحتفاظ بالـ save() للتوافق مع lib/adhkar.js (لم يعد ضرورياً مع SQLite)
export function save() {
    // SQLite يحفظ تلقائياً - هذه الدالة موجودة فقط للتوافق مع الكود القديم
}

export { db };
