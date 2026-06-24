import { registerCommand, commands } from '../../lib/handler.js';
import { database } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { getStats } from '../../lib/restart.js';
import { formatDuration } from '../../lib/utils.js';

// ✨ وقت تشغيل البوت
const startTime = Date.now();

// 📊 إحصائيات البوت التفصيلية
registerCommand('stats', async (ctx) => {
    const uptime = Date.now() - startTime;
    const uptimeHours = Math.floor(uptime / 3600000);
    const uptimeMinutes = Math.floor((uptime % 3600000) / 60000);

    const userCount = database.stats.userCount();
    const groupCount = database.stats.groupCount();
    const cmdCount = commands.size;
    const restartStats = getStats();

    const memUsage = process.memoryUsage();
    const ramMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const ramTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    let text = `📊 *إحصائيات Astro Bot v2.0*\n\n`;
    text += `⏱️ *وقت التشغيل:* ${uptimeHours} ساعة و ${uptimeMinutes} دقيقة\n`;
    text += `👥 *عدد المستخدمين:* ${userCount}\n`;
    text += `👥 *عدد المجموعات:* ${groupCount}\n`;
    text += `🔧 *عدد الأوامر:* ${cmdCount}\n`;
    text += `🔄 *محاولات إعادة الاتصال:* ${restartStats.retryCount}\n`;
    text += `💾 *استهلاك الرام:* ${ramMB} MB / ${ramTotalMB} MB\n`;
    text += `🧠 *Node.js:* ${process.version}\n`;
    text += `💻 *المنصة:* ${process.platform}`;

    await ctx.reply(text);
}, {
    description: 'عرض إحصائيات البوت التفصيلية',
    category: '👑 المالك',
    ownerOnly: true
});

// 📡 بث رسالة لكل المجموعات
registerCommand('broadcast', async (ctx) => {
    const message = ctx.args.join(' ');
    if (!message) {
        return ctx.reply('❌ يرجى كتابة نص الرسالة للبث!');
    }

    try {
        // جلب قائمة المجموعات من الجلسة
        const groups = await ctx.sock.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);
        let successCount = 0;
        let failCount = 0;

        await ctx.reply(`📡 جاري بث الرسالة لـ *${groupIds.length}* مجموعة...`);

        for (const jid of groupIds) {
            try {
                await ctx.sock.sendMessage(jid, { text: `📢 *رسالة بث من المالك:*\n\n${message}` });
                successCount++;
            } catch (_) {
                failCount++;
            }
        }

        await ctx.reply(`✅ تم البث بنجاح!\n✅ نجح: *${successCount}* مجموعة\n❌ فشل: *${failCount}* مجموعة`);
    } catch (e) {
        logger.error('خطأ في البث:', e);
        await ctx.reply('❌ فشل بث الرسالة.');
    }
}, {
    description: 'بث رسالة لجميع المجموعات التي البوت فيها',
    category: '👑 المالك',
    ownerOnly: true
});

// 🔄 إعادة تشغيل البوت
registerCommand('ريستارت', async (ctx) => {
    await ctx.reply('🔄 جاري إعادة تشغيل البوت...');
    const { fullRestart } = await import('../../lib/restart.js');
    fullRestart('أمر يدوي من المالك');
}, {
    description: 'إعادة تشغيل البوت',
    category: '👑 المالك',
    ownerOnly: true
});

// 📝 تحديث حالة البوت (الستاتوس)
registerCommand('ستاتوس', async (ctx) => {
    const status = ctx.args.join(' ');
    if (!status) {
        return ctx.reply('❌ يرجى كتابة حالة الستاتوس الجديدة!');
    }

    try {
        await ctx.sock.sendPresenceUpdate('composing', null);
        await ctx.sock.profilePictureUrl(ctx.sock.user.id).catch(() => {});

        await ctx.sock.sendMessage('status@broadcast', {
            text: status
        }, {
            backgroundColor: '#075E54',
            font: 2,
            statusJidList: undefined
        });

        await ctx.reply('✅ تم تحديث حالة البوت بنجاح!');
    } catch (e) {
        logger.error('خطأ في تحديث الستاتوس:', e);
        await ctx.reply('❌ فشل تحديث الحالة.');
    }
}, {
    description: 'تحديث حالة (ستاتوس) البوت',
    category: '👑 المالك',
    ownerOnly: true
});

// 🗑️ حذف مستخدم من قاعدة البيانات
registerCommand('حذف_مستخدم', async (ctx) => {
    const mentioned = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const targetJid = mentioned?.[0];

    if (!targetJid) {
        return ctx.reply('❌ رجاء عمل منشن للمستخدم المراد حذفه!');
    }

    database.deleteUser(targetJid);
    await ctx.reply(`🗑️ تم حذف بيانات @${targetJid.split('@')[0]} من قاعدة البيانات.`, { mentions: [targetJid] });
}, {
    description: 'حذف بيانات مستخدم من قاعدة البيانات',
    category: '👑 المالك',
    ownerOnly: true
});

// 💾 نسخ احتياطي فوري لقاعدة البيانات
registerCommand('نسخ', async (ctx) => {
    try {
        database.backup();
        await ctx.reply('✅ تم بدء إنشاء نسخة احتياطية من قاعدة البيانات.');
    } catch (e) {
        logger.error('خطأ في النسخ الاحتياطي:', e);
        await ctx.reply('❌ فشل إنشاء النسخة الاحتياطية.');
    }
}, {
    description: 'إنشاء نسخة احتياطية فورية من قاعدة البيانات',
    category: '👑 المالك',
    ownerOnly: true
});

// 📋 قائمة المجموعات المفعّل فيها البوت
registerCommand('قائمة_الجروبات', async (ctx) => {
    try {
        const groups = await ctx.sock.groupFetchAllParticipating();
        const groupList = Object.values(groups);

        let text = `📋 *قائمة المجموعات (${groupList.length}):*\n\n`;
        groupList.slice(0, 30).forEach((g, i) => {
            text += `${i + 1}. ${g.subject || 'بدون اسم'} (${g.id.split('@')[0]})\n`;
        });

        if (groupList.length > 30) {
            text += `\n... و ${groupList.length - 30} مجموعة أخرى`;
        }

        await ctx.reply(text);
    } catch (e) {
        logger.error('خطأ في قائمة الجروبات:', e);
        await ctx.reply('❌ فشل جلب القائمة.');
    }
}, {
    description: 'عرض قائمة المجموعات التي البوت فيها',
    category: '👑 المالك',
    ownerOnly: true
});

// 💻 تشغيل أوامر النظام (تيرمينال)
registerCommand('exec', async (ctx) => {
    const command = ctx.args.join(' ');
    if (!command) {
        return ctx.reply('❌ يرجى كتابة الأمر المراد تنفيذه!');
    }

    const { exec } = await import('child_process');
    exec(command, async (err, stdout, stderr) => {
        if (err) {
            return await ctx.reply(`❌ *خطأ في التنفيذ:*\n\`\`\`${err.message}\`\`\``);
        }
        const output = stdout || stderr;
        if (output) {
            return await ctx.reply(`💻 *مخرجات الأمر:*\n\`\`\`${output.trim()}\`\`\``);
        } else {
            return await ctx.reply(`✅ *تم التنفيذ بنجاح بدون مخرجات.*`);
        }
    });
}, {
    description: 'تشغيل أوامر النظام (تيرمينال) مباشرة من الواتساب',
    category: '👑 المالك',
    ownerOnly: true
});
