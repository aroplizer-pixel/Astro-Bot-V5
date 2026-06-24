// 🔄 سكربت ترحيل البيانات من JSON القديم إلى SQLite
// يُشغّل تلقائياً عند أول تشغيل بعد الترقية

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

const jsonDbPath = path.resolve('./data/database.json');
const migratedFlag = path.resolve('./data/.migrated_to_sqlite');

/**
 * ترحيل قاعدة البيانات القديمة من JSON إلى SQLite
 * تُستدعى تلقائياً عند بدء التشغيل
 */
export function runMigrationIfNeeded() {
    // إذا تم الترحيل مسبقاً، لا نفعل شيئاً
    if (fs.existsSync(migratedFlag)) return;
    // إذا لم يوجد ملف JSON قديم، نسجل العلامة ونخرج
    if (!fs.existsSync(jsonDbPath)) {
        try { fs.writeFileSync(migratedFlag, new Date().toISOString()); } catch (_) {}
        return;
    }

    try {
        logger.info('🔄 تم اكتشاف قاعدة بيانات JSON قديمة. جاري الترحيل إلى SQLite...');

        const oldDb = JSON.parse(fs.readFileSync(jsonDbPath, 'utf-8'));
        const groups = oldDb.groups || {};
        const users = oldDb.users || {};
        const clans = oldDb.clans || {};

        const sqliteDb = new Database(path.resolve('./data/database.db'));
        sqliteDb.pragma('journal_mode = WAL');

        // إنشاء الجداول (نفس schema الموجود في db.js)
        createTables(sqliteDb);

        const txCount = { groups: 0, users: 0, clans: 0 };

        // الترحيل داخل معاملة واحدة للسلامة
        const migrate = sqliteDb.transaction(() => {
            for (const [jid, g] of Object.entries(groups)) {
                migrateGroup(sqliteDb, jid, g);
                txCount.groups++;
            }
            for (const [jid, u] of Object.entries(users)) {
                migrateUser(sqliteDb, jid, u);
                txCount.users++;
            }
            for (const [name, c] of Object.entries(clans)) {
                migrateClan(sqliteDb, name, c);
                txCount.clans++;
            }
        });

        migrate();
        sqliteDb.close();

        // إعادة تسمية الملف القديم بدل حذفه (كاحتياط)
        const backupName = `database.json.backup_${Date.now()}`;
        fs.renameSync(jsonDbPath, path.resolve('./data', backupName));
        fs.writeFileSync(migratedFlag, new Date().toISOString());

        logger.success(`✅ تم الترحيل بنجاح! المجموعات: ${txCount.groups} | المستخدمون: ${txCount.users} | التحالفات: ${txCount.clans}`);
        logger.info(`📦 تم حفظ نسخة من ملف JSON القديم: ${backupName}`);
    } catch (err) {
        logger.error('❌ فشل الترحيل:', err);
        logger.warn('⚠️ سيتم البدء بقاعدة بيانات جديدة. ملف JSON محفوظ.');
    }
}

// ──────────────────────────────────────────────────────────────
// دوال مساعدة للترحيل
// ──────────────────────────────────────────────────────────────
function createTables(sqliteDb) {
    sqliteDb.exec(`
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
            extra TEXT DEFAULT '{}'
        );
        CREATE TABLE IF NOT EXISTS clans (
            name TEXT PRIMARY KEY,
            leader TEXT NOT NULL,
            members TEXT DEFAULT '[]',
            treasury INTEGER DEFAULT 0,
            extra TEXT DEFAULT '{}'
        );
    `);
}

function migrateUser(sqliteDb, jid, u) {
    sqliteDb.prepare(`
        INSERT OR REPLACE INTO users
        (jid, xp, level, wallet, bank, lastDaily, warnings, shield, title, partner, clan, inventory, aiPersona, extra)
        VALUES (@jid, @xp, @level, @wallet, @bank, @lastDaily, @warnings, @shield, @title, @partner, @clan, @inventory, @aiPersona, @extra)
    `).run({
        jid,
        xp: u.xp || 0,
        level: u.level || 1,
        wallet: u.wallet ?? 100,
        bank: u.bank || 0,
        lastDaily: u.lastDaily || 0,
        warnings: u.warnings || 0,
        shield: u.shield || 0,
        title: u.title || null,
        partner: u.partner || null,
        clan: u.clan || null,
        inventory: JSON.stringify(u.inventory || []),
        aiPersona: u.aiPersona || 'default',
        extra: '{}'
    });
}

function migrateGroup(sqliteDb, jid, g) {
    sqliteDb.prepare(`
        INSERT OR REPLACE INTO groups
        (jid, antiLink, antiSpam, antiBadwords, antiDelete, autoAdhkar, welcome, welcomeMessage, goodbyeMessage, aiPersona, extra)
        VALUES (@jid, @antiLink, @antiSpam, @antiBadwords, @antiDelete, @autoAdhkar, @welcome, @welcomeMessage, @goodbyeMessage, @aiPersona, @extra)
    `).run({
        jid,
        antiLink: g.antiLink ? 1 : 0,
        antiSpam: g.antiSpam ? 1 : 0,
        antiBadwords: g.antiBadwords ? 1 : 0,
        antiDelete: g.antiDelete ? 1 : 0,
        autoAdhkar: g.autoAdhkar ? 1 : 0,
        welcome: g.welcome === false ? 0 : 1,
        welcomeMessage: g.welcomeMessage || 'مرحباً بك يا @user في المجموعة! 👋',
        goodbyeMessage: g.goodbyeMessage || 'وداعاً يا @user.. 🥺',
        aiPersona: g.aiPersona || 'default',
        extra: '{}'
    });
}

function migrateClan(sqliteDb, name, c) {
    sqliteDb.prepare(`
        INSERT OR REPLACE INTO clans
        (name, leader, members, treasury, extra)
        VALUES (@name, @leader, @members, @treasury, @extra)
    `).run({
        name,
        leader: c.leader,
        members: JSON.stringify(c.members || []),
        treasury: c.treasury || 0,
        extra: '{}'
    });
}
