import { registerCommand } from '../../lib/handler.js';
import { logger } from '../../lib/logger.js';
import { formatDuration } from '../../lib/utils.js';

// ℹ️ معلومات المجموعة التفصيلية
registerCommand('معلومات_الجروب', async (ctx) => {
    try {
        const meta = await ctx.sock.groupMetadata(ctx.from);
        const admins = meta.participants.filter(p => p.admin !== null);
        const owner = meta.participants.find(p => p.admin === 'superadmin' || p.admin === 'admin' && p.id === meta.owner);

        let info = `👥 *معلومات المجموعة*\n\n`;
        info += `📛 *الاسم:* ${meta.subject}\n`;
        info += `📝 *الوصف:* ${meta.desc || 'لا يوجد'}\n`;
        info += `👥 *عدد الأعضاء:* ${meta.participants.length}\n`;
        info += `🛡️ *عدد المشرفين:* ${admins.length}\n`;
        if (meta.owner) {
            info += `👑 *المالك:* @${meta.owner.split('@')[0]}\n`;
        }
        if (meta.creation) {
            const createdDate = new Date(meta.creation * 1000).toLocaleDateString('ar-EG');
            info += `📅 *تاريخ الإنشاء:* ${createdDate}\n`;
        }

        const mentions = meta.owner ? [meta.owner] : [];
        await ctx.sock.sendMessage(ctx.from, { text: info, mentions }, { quoted: ctx.msg });
    } catch (e) {
        logger.error('خطأ في جلب معلومات الجروب:', e.message);
        await ctx.reply('❌ فشل جلب معلومات المجموعة.');
    }
}, {
    description: 'عرض معلومات تفصيلية عن المجموعة الحالية',
    category: '🛡️ حماية وإدارة',
    groupOnly: true
});

// 🏷️ تعديل اسم المجموعة
registerCommand('تغيير_الاسم', async (ctx) => {
    const newName = ctx.args.join(' ').trim();
    if (!newName) {
        return ctx.reply('❌ يرجى كتابة الاسم الجديد للمجموعة!');
    }

    try {
        await ctx.sock.groupUpdateSubject(ctx.from, newName);
        await ctx.reply(`✅ تم تغيير اسم المجموعة إلى: *${newName}*`);
    } catch (e) {
        logger.error('فشل تغيير اسم الجروب:', e.message);
        await ctx.reply('❌ فشل تغيير الاسم. تأكد أن البوت مشرف.');
    }
}, {
    description: 'تغيير اسم المجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true
});

// 📝 تعديل وصف المجموعة
registerCommand('تغيير_الوصف', async (ctx) => {
    const newDesc = ctx.args.join(' ').trim();
    if (!newDesc) {
        return ctx.reply('❌ يرجى كتابة الوصف الجديد!');
    }

    try {
        await ctx.sock.groupUpdateDescription(ctx.from, newDesc);
        await ctx.reply(`✅ تم تحديث وصف المجموعة بنجاح.`);
    } catch (e) {
        logger.error('فشل تغيير وصف الجروب:', e.message);
        await ctx.reply('❌ فشل تحديث الوصف. تأكد أن البوت مشرف.');
    }
}, {
    description: 'تغيير وصف المجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true
});

// 🔗 جلب رابط المجموعة
registerCommand('رابط_الجروب', async (ctx) => {
    try {
        const code = await ctx.sock.groupInviteCode(ctx.from);
        const link = `https://chat.whatsapp.com/${code}`;
        await ctx.reply(`🔗 *رابط المجموعة:*\n${link}`);
    } catch (e) {
        logger.error('فشل جلب رابط الجروب:', e.message);
        await ctx.reply('❌ فشل جلب الرابط. تأكد أن البوت مشرف.');
    }
}, {
    description: 'جلب رابط دعوة المجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true
});

// 🔄 إعادة توليد رابط المجموعة (إبطال القديم)
registerCommand('تجديد_الرابط', async (ctx) => {
    try {
        await ctx.sock.groupRevokeInvite(ctx.from);
        const newCode = await ctx.sock.groupInviteCode(ctx.from);
        await ctx.reply(`✅ تم إبطال الرابط القديم وتوليد رابط جديد:\nhttps://chat.whatsapp.com/${newCode}`);
    } catch (e) {
        logger.error('فشل تجديد رابط الجروب:', e.message);
        await ctx.reply('❌ فشل تجديد الرابط. تأكد أن البوت مشرف.');
    }
}, {
    description: 'إبطال الرابط القديم وتوليد رابط جديد للمجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true
});

// 🔒 إغلاق/فتح المجموعة (للمشرفين فقط)
registerCommand('قفل_الجروب', async (ctx) => {
    try {
        await ctx.sock.groupSettingUpdate(ctx.from, 'announcement');
        await ctx.reply('🔒 تم قفل المجموعة - الآن المشرفون فقط يمكنهم الإرسال.');
    } catch (e) {
        logger.error('فشل قفل الجروب:', e.message);
        await ctx.reply('❌ فشل القفل. تأكد أن البوت مشرف.');
    }
}, {
    description: 'قفل المجموعة (إرسال المشرفين فقط)',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true
});

registerCommand('فتح_الجروب', async (ctx) => {
    try {
        await ctx.sock.groupSettingUpdate(ctx.from, 'not_announcement');
        await ctx.reply('🔓 تم فتح المجموعة - جميع الأعضاء يمكنهم الإرسال الآن.');
    } catch (e) {
        logger.error('فشل فتح الجروب:', e.message);
        await ctx.reply('❌ فشل الفتح. تأكد أن البوت مشرف.');
    }
}, {
    description: 'فتح المجموعة (الجميع يمكنهم الإرسال)',
    category: '🛡️ حماية وإدارة',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true
});

// 🔍 جلب بروفايل شخص من المجموعة
registerCommand('بروفايل_جروب', async (ctx) => {
    const mentioned = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    let targetJid = null;

    if (mentioned && mentioned.length > 0) {
        targetJid = mentioned[0];
    } else {
        const quotedParticipant = ctx.msg.message?.extendedTextMessage?.contextInfo?.participant;
        if (quotedParticipant) targetJid = quotedParticipant;
    }

    if (!targetJid) {
        return ctx.reply('❌ رجاء عمل منشن أو رد على رسالة الشخص الذي تريد رؤية بروفايله!');
    }

    try {
        const pfpUrl = await ctx.sock.profilePictureUrl(targetJid, 'image').catch(() => null);
        const number = targetJid.split('@')[0];

        if (pfpUrl) {
            const response = await (await import('axios')).default.get(pfpUrl, { responseType: 'arraybuffer', timeout: 10000 });
            await ctx.sock.sendMessage(ctx.from, {
                image: Buffer.from(response.data),
                caption: `🖼️ *صورة بروفايل:* @${number}`,
                mentions: [targetJid]
            }, { quoted: ctx.msg });
        } else {
            await ctx.reply(`👤 *@${number}* ليس لديه صورة بروفايل (مخفية).`, { mentions: [targetJid] });
        }
    } catch (e) {
        logger.error('فشل جلب البروفايل:', e.message);
        await ctx.reply('❌ تعذّر جلب بروفايل هذا الشخص.');
    }
}, {
    description: 'عرض صورة بروفايل أي شخص في المجموعة',
    category: '🛡️ حماية وإدارة',
    groupOnly: true
});
