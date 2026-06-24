import { registerCommand } from '../../lib/handler.js';
import { database, db } from '../../lib/db.js';
import { formatNumber, randomInt } from '../../lib/utils.js';

// دعوات الانضمام المؤقتة في الذاكرة (المستدعى -> اسم الكلان)
const pendingInvites = new Map();
// سجل أوقات الهجوم لتفادي السبام (اسم التحالف المهاجم -> وقت الهجوم)
const lastClanAttackTime = new Map();

registerCommand('تحالف', async (ctx) => {
    const subCommand = ctx.args[0];

    if (!subCommand) {
        let helpText = `🛡️ *نظام التحالفات والعشائر الملكي (Clans)* 🛡️\n\n`;
        helpText += `قم ببناء جيشك والتعاون الاقتصادي والسطو على خزائن الأعداء!\n`;
        helpText += `━━━━━━━━━━━━━━━━━\n\n`;
        helpText += `✨ *أوامر الإنشاء والإدارة:*\n`;
        helpText += `• *.تحالف انشاء [الاسم]* : إنشاء تحالف جديد (يكلف 5,000 ذهبة)\n`;
        helpText += `• *.تحالف معلومات* : عرض تفاصيل تحالفك الحالي وأعضائه\n`;
        helpText += `• *.تحالف ترتيب* : عرض التحالفات الأقوى والخزائن الأكثر ثراءً\n\n`;
        helpText += `👥 *التفاعل والدعوات:*\n`;
        helpText += `• *.تحالف دعوة [منشن]* : دعوة لاعب للانضمام إليك (للقائد فقط)\n`;
        helpText += `• *.تحالف قبول* : قبول دعوة الانضمام للتحالف\n`;
        helpText += `• *.تحالف ايداع [المبلغ]* : نقل الذهب من محفظتك لخزنة التحالف\n`;
        helpText += `• *.تحالف مغادرة* : مغادرة التحالف الحالي\n\n`;
        helpText += `⚔️ *شؤون الحرب والغزو (PVP Clans):*\n`;
        helpText += `• *.تحالف هجوم [اسم التحالف]* : غزو تحالف أعداء ونهب خزنتهم (للقائد فقط)\n`;
        helpText += `• *.تحالف طرد [منشن]* : طرد لاعب من التحالف (للقائد فقط)`;

        const buttons = [
            { id: '.تحالف معلومات', text: 'ℹ️ معلومات تحالفي' },
            { id: '.تحالف ترتيب', text: '🏆 لوحة صدارة التحالفات' },
            { id: '.بروفايل', text: '📊 بروفايلي' }
        ];

        return ctx.replyWithButtons(helpText, 'التحالفات القوية تحكم ساحة المعركة!', buttons);
    }

    const senderJid = ctx.sender;
    const user = database.getUser(senderJid);

    // 1. إنشاء تحالف
    if (subCommand === 'انشاء' || subCommand === 'إنشاء') {
        const clanName = ctx.args.slice(1).join(' ').trim();
        if (!clanName) return ctx.reply('❌ يرجى تحديد اسم للتحالف!\n👉 مثال: *.تحالف انشاء الفرسان*');
        if (clanName.length > 20) return ctx.reply('❌ اسم التحالف طويل جداً! الحد الأقصى 20 حرفاً.');
        if (user.clan) return ctx.reply(`❌ أنت تنتمي بالفعل لتحالف: *[ ${user.clan} ]*!`);

        const creationCost = 5000;
        if (user.wallet < creationCost) {
            return ctx.reply(`❌ إنشاء تحالف يتطلب *5,000* عملة ذهبية في محفظتك! ذهبك الحالي: *${formatNumber(user.wallet)}*`);
        }

        const existing = database.getClan(clanName);
        if (existing) return ctx.reply('❌ هذا الاسم مستخدم بالفعل من قبل تحالف آخر!');

        database.createClan(clanName, senderJid);
        database.updateUser(senderJid, {
            wallet: user.wallet - creationCost,
            clan: clanName
        });

        return ctx.reply(`🎉 تم إنشاء تحالف *[ ${clanName} ]* بنجاح! 👑\nلقد أصبحت القائد وتم خصم *5,000* عملة ذهبية لتأسيس القلعة.`);
    }

    // 2. معلومات التحالف
    if (subCommand === 'معلومات') {
        if (!user.clan) return ctx.reply('❌ أنت لا تنتمي لأي تحالف حالياً! اكتب *.تحالف انشاء [الاسم]* للبدء.');

        const clan = database.getClan(user.clan);
        if (!clan) return ctx.reply('❌ حدث خطأ، لم نتمكن من العثور على بيانات تحالفك.');

        const leaderNumber = clan.leader.split('@')[0];
        let info = `🛡️ *بيانات قلعة التحالف: [ ${user.clan} ]* 🛡️\n\n`;
        info += `👑 *القائد والملك:* @${leaderNumber}\n`;
        info += `💰 *الخزنة الملكية:* *${formatNumber(clan.treasury)}* ذهبة\n`;
        info += `👥 *الجيش والأعضاء:* *${clan.members.length}* محاربين\n\n`;
        info += `📝 *سجل الأعضاء التابعين:*\n`;

        clan.members.forEach((m, idx) => {
            const isLeader = m === clan.leader ? ' 👑 (قائد)' : '';
            info += `  ${idx + 1}. @${m.split('@')[0]}${isLeader}\n`;
        });

        const mentions = [...clan.members];
        const buttons = [
            { id: '.تحالف ترتيب', text: '🏆 لوحة صدارة التحالفات' },
            { id: '.عمل', text: '💼 العمل لجمع الذهب' }
        ];

        await ctx.sock.sendMessage(ctx.from, {
            text: info,
            buttons: buttons.map(b => ({ buttonId: b.id, buttonText: { displayText: b.text }, type: 1 })),
            headerType: 1,
            mentions
        }, { quoted: ctx.msg }).catch(async () => {
            let fallback = info + `\n━━━━━━━━━━━━━━━━━\n`;
            buttons.forEach(b => { fallback += `🔹 [ ${b.text} ] ➔ اكتب *${b.id}*\n`; });
            await ctx.sock.sendMessage(ctx.from, { text: fallback, mentions }, { quoted: ctx.msg });
        });
    }

    // 3. ترتيب التحالفات
    if (subCommand === 'ترتيب') {
        try {
            const clansList = db.prepare('SELECT * FROM clans ORDER BY treasury DESC LIMIT 10').all();
            if (clansList.length === 0) {
                return ctx.reply('📭 لا توجد تحالفات مسجلة في المملكة حالياً!');
            }

            let boardText = `🏆 *لوحة شرف أقوى وأغنى تحالفات البوت* 🏆\n\n`;
            clansList.forEach((c, idx) => {
                const members = JSON.parse(c.members || '[]');
                let trophy = '⚔️';
                if (idx === 0) trophy = '🥇';
                else if (idx === 1) trophy = '🥈';
                else if (idx === 2) trophy = '🥉';

                boardText += `${trophy} *المركز ${idx + 1}: [ ${c.name} ]*\n`;
                boardText += `   💰 الخزنة: *${formatNumber(c.treasury)}* ذهبة | 👥 الأعضاء: *${members.length}*\n`;
                boardText += `   👑 القائد: @${c.leader.split('@')[0]}\n\n`;
            });

            const mentions = clansList.map(c => c.leader);
            await ctx.sock.sendMessage(ctx.from, {
                text: boardText,
                mentions
            }, { quoted: ctx.msg });
        } catch (err) {
            ctx.reply('❌ فشل جلب ترتيب التحالفات.');
        }
    }

    // 4. دعوة لاعب
    if (subCommand === 'دعوة' || subCommand === 'دعوه') {
        if (!user.clan) return ctx.reply('❌ أنت لا تنتمي لأي تحالف لإرسال دعوات!');
        const clan = database.getClan(user.clan);

        if (clan.leader !== senderJid) {
            return ctx.reply('❌ صلاحية إرسال الدعوات تقتصر على قائد التحالف فقط!');
        }

        let target = null;
        if (ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = ctx.msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (ctx.msg.message?.extendedTextMessage?.contextInfo?.participant) {
            target = ctx.msg.message.extendedTextMessage.contextInfo.participant;
        }

        if (!target) return ctx.reply('❌ يرجى الإشارة للعضو (منشن) أو الرد على رسالته لدعوته!');

        const targetUser = database.getUser(target);
        if (targetUser.clan) return ctx.reply('❌ هذا اللاعب ينتمي بالفعل لتحالف آخر!');

        pendingInvites.set(target, user.clan);
        await ctx.reply(`✉️ تم إرسال دعوة انضمام لـ @${target.split('@')[0]} للانضمام إلى تحالف *[ ${user.clan} ]*.\n👉 للقبول اكتب: *.تحالف قبول*`, {
            mentions: [target]
        });
    }

    // 5. قبول الدعوة
    if (subCommand === 'قبول') {
        const invitedClan = pendingInvites.get(senderJid);
        if (!invitedClan) return ctx.reply('❌ ليس لديك أي دعوات انضمام معلقة حالياً!');

        const clan = database.getClan(invitedClan);
        if (!clan) {
            pendingInvites.delete(senderJid);
            return ctx.reply('❌ عذراً، يبدو أن التحالف لم يعد موجوداً في السجلات.');
        }

        clan.members.push(senderJid);
        database.updateClan(invitedClan, { members: clan.members });
        database.updateUser(senderJid, { clan: invitedClan });
        pendingInvites.delete(senderJid);

        await ctx.reply(`🎉 تهانينا! لقد انضممت بنجاح لجيش تحالف *[ ${invitedClan} ]*. طاعة عمياء لقائدك!`);
    }

    // 6. إيداع أموال في الخزنة
    if (subCommand === 'ايداع' || subCommand === 'إيداع') {
        if (!user.clan) return ctx.reply('❌ يجب أن تكون عضواً في تحالف لتتمكن من دعم الخزنة!');
        const amountStr = ctx.args[1];
        const clan = database.getClan(user.clan);
        let amount = 0;

        if (amountStr === 'الكل') {
            amount = user.wallet;
        } else {
            amount = parseInt(amountStr);
        }

        if (isNaN(amount) || amount <= 0) return ctx.reply('❌ الرجاء إدخال مبلغ صحيح أكبر من الصفر للإيداع!');
        if (user.wallet < amount) return ctx.reply(`❌ رصيدك الحالي لا يكفي! تملك فقط *${formatNumber(user.wallet)}* ذهبة.`);

        database.updateClan(user.clan, { treasury: clan.treasury + amount });
        database.updateUser(senderJid, { wallet: user.wallet - amount });

        await ctx.reply(`💰 تم إيداع *${formatNumber(amount)}* ذهبة بنجاح في خزنة تحالفك! شكراً لدعمك المالي.`);
    }

    // 7. طرد عضو من التحالف
    if (subCommand === 'طرد') {
        if (!user.clan) return ctx.reply('❌ أنت لا تنتمي لأي تحالف!');
        const clan = database.getClan(user.clan);

        if (clan.leader !== senderJid) {
            return ctx.reply('❌ طرد الأعضاء من الصلاحيات الخاصة بالقائد والملك فقط!');
        }

        let target = null;
        if (ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = ctx.msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (ctx.msg.message?.extendedTextMessage?.contextInfo?.participant) {
            target = ctx.msg.message.extendedTextMessage.contextInfo.participant;
        }

        if (!target) return ctx.reply('❌ يرجى عمل منشن للعضو المراد طرده!');
        if (target === senderJid) return ctx.reply('❌ لا يمكنك طرد نفسك! يمكنك مغادرة التحالف لتفكيكه.');

        const index = clan.members.indexOf(target);
        if (index === -1) return ctx.reply('❌ هذا العضو ليس في تحالفك!');

        clan.members.splice(index, 1);
        database.updateClan(user.clan, { members: clan.members });
        database.updateUser(target, { clan: null });

        await ctx.reply(`✅ تم نفي وطرد العضو بنجاح من التحالف ونزع حمايته.`);
    }

    // 8. مغادرة التحالف
    if (subCommand === 'مغادرة' || subCommand === 'مغادره') {
        if (!user.clan) return ctx.reply('❌ أنت لا تنتمي لأي تحالف لمغادرته!');
        const clan = database.getClan(user.clan);

        if (clan.leader === senderJid) {
            // تفكيك التحالف
            clan.members.forEach(member => {
                database.updateUser(member, { clan: null });
            });
            database.deleteClan(user.clan);
            return ctx.reply(`⚠️ لقد غادرت التحالف بصفتك الملك والقائد، وبالتالي تم تدمير وتفكيك تحالف *[ ${user.clan} ]* بالكامل.`);
        } else {
            const index = clan.members.indexOf(senderJid);
            clan.members.splice(index, 1);
            database.updateClan(user.clan, { members: clan.members });
            database.updateUser(senderJid, { clan: null });
            return ctx.reply(`✅ لقد غادرت تحالف *[ ${user.clan} ]* بنجاح.`);
        }
    }

    // 9. غزو وهجوم التحالفات (Clan Wars)
    if (subCommand === 'هجوم' || subCommand === 'غزو') {
        if (!user.clan) return ctx.reply('❌ يجب أن تنتمي لتحالف لتتمكن من شن الحروب!');
        const myClan = database.getClan(user.clan);

        if (myClan.leader !== senderJid) {
            return ctx.reply('❌ شن هجمات الغزو والغارات هي صلاحية ملك وقائد التحالف فقط!');
        }

        const targetClanName = ctx.args.slice(1).join(' ').trim();
        if (!targetClanName) {
            return ctx.reply('❌ يرجى تحديد اسم التحالف المستهدف للغزو!\n👉 مثال: *.تحالف هجوم الأعداء*');
        }

        const enemyClan = database.getClan(targetClanName);
        if (!enemyClan) {
            return ctx.reply('❌ التحالف المستهدف غير موجود! تحقق من الاسم المكتوب.');
        }

        if (enemyClan.name === myClan.name) {
            return ctx.reply('😅 هل تحاول غزو تحالفك ونفسك؟ هذا تمرد عسكري غبي!');
        }

        // التحقق من وقت الانتظار (cooldown 4 ساعات)
        const now = Date.now();
        const cooldown = 4 * 60 * 60 * 1000;
        const lastAttack = lastClanAttackTime.get(myClan.name) || 0;

        if (now - lastAttack < cooldown) {
            const remaining = cooldown - (now - lastAttack);
            const hours = Math.floor(remaining / (60 * 60 * 1000));
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            return ctx.reply(`⚠️ قواتك متعبة حالياً! جيشك يتدرب للمعركة القادمة. يمكنك الهجوم بعد *${hours} ساعة و ${minutes} دقيقة*.`);
        }

        if (enemyClan.treasury < 500) {
            return ctx.reply('❌ خزنة هذا التحالف فقيرة جداً (أقل من 500 ذهبة). لا طائل من نهبهم الآن!');
        }

        lastClanAttackTime.set(myClan.name, now);

        await ctx.reply(`⚔️ *جيش [ ${myClan.name} ] يقرع طبول الحرب ويتحرك لغزو قلعة [ ${enemyClan.name} ]!* ⚔️\n\nجاري الاشتباك وحصار القلعة...`);

        // احتساب مستويات الأعضاء لإعطاء عمق للمعركة
        let myTotalLevel = 0;
        let enemyTotalLevel = 0;

        myClan.members.forEach(m => {
            const u = database.getUser(m);
            myTotalLevel += u.level || 1;
        });

        enemyClan.members.forEach(m => {
            const u = database.getUser(m);
            enemyTotalLevel += u.level || 1;
        });

        // احتساب فرص الفوز (تعتمد على الفارق في قوة مستويات الأعضاء)
        const diff = myTotalLevel - enemyTotalLevel;
        let winChance = 0.50; // 50%
        if (diff > 0) {
            winChance = Math.min(0.80, 0.50 + (diff / 200));
        } else {
            winChance = Math.max(0.25, 0.50 + (diff / 200));
        }

        const victory = Math.random() < winChance;

        if (victory) {
            // سرقة ما بين 12% إلى 25% من خزنة الأعداء
            const lootPercent = randomInt(12, 25) / 100;
            const stolenAmount = Math.round(enemyClan.treasury * lootPercent);

            database.updateClan(myClan.name, { treasury: myClan.treasury + stolenAmount });
            database.updateClan(enemyClan.name, { treasury: enemyClan.treasury - stolenAmount });

            let victoryMsg = `🥇 *نصر مؤزر وغنيمة كبرى!* 🏆\n\n`;
            victoryMsg += `نجح جيش *[ ${myClan.name} ]* في اختراق بوابات قلعة *[ ${enemyClan.name} ]* بعد قتال بطولي!\n\n`;
            victoryMsg += `💰 الغنائم المنهوبة: *+${formatNumber(stolenAmount)}* ذهبة أضيفت لخزنة تحالفك!\n`;
            victoryMsg += `📊 فرصة الفوز العسكرية كانت: *${Math.round(winChance * 100)}%*`;

            const mentions = [myClan.leader, enemyClan.leader];
            await ctx.sock.sendMessage(ctx.from, { text: victoryMsg, mentions });
        } else {
            // هزيمة ودفع تعويضات 10% للعدو
            const penalty = Math.round(myClan.treasury * 0.10);
            database.updateClan(myClan.name, { treasury: myClan.treasury - penalty });
            database.updateClan(enemyClan.name, { treasury: enemyClan.treasury + penalty });

            let lossMsg = `💀 *هزيمة نكراء وتراجع عسكري!* 🥀\n\n`;
            lossMsg += `تصدى مدافعو قلعة *[ ${enemyClan.name} ]* ببسالة لهجوم قوات *[ ${myClan.name} ]* وأجبروهم على الانسحاب جرّ الخيبة!\n\n`;
            lossMsg += `💸 الخسائر: تم تغريم تحالفك بدفع تعويضات حرب للعدو بقيمة *${formatNumber(penalty)}* ذهبة من خزنتكم.\n`;
            lossMsg += `📊 فرصة الفوز العسكرية كانت: *${Math.round(winChance * 100)}%*`;

            const mentions = [myClan.leader, enemyClan.leader];
            await ctx.sock.sendMessage(ctx.from, { text: lossMsg, mentions });
        }
    }
}, {
    description: 'إدارة التحالفات وحروب الغزو وسرقة خزائن الأعداء',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});
