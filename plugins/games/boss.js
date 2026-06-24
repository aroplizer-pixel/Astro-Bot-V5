import { registerCommand } from '../../lib/handler.js';
import { database } from '../../lib/db.js';
import { randomInt, formatNumber, formatDuration } from '../../lib/utils.js';
import config from '../../config.js';

// ذاكرة مؤقتة للزعماء النشطين لكل مجموعة (remoteJid -> Boss Object)
export const activeBosses = new Map();
// ذاكرة مؤقتة لمهلة استدعاء الزعماء (remoteJid -> Timestamp)
const summonCooldowns = new Map();

// قوالب الزعماء
const BOSS_TEMPLATES = [
    { name: '🐉 التنين الأحمر الأسطوري', maxHp: 12000, baseGold: 5000, baseGems: 8, baseIron: 6, duration: 15 * 60 * 1000 },
    { name: '🧌 عملاق الصخور الغاضب', maxHp: 8000, baseGold: 3000, baseGems: 4, baseIron: 4, duration: 12 * 60 * 1000 },
    { name: '🧙‍♂️ ساحر الظلام الملعون', maxHp: 10000, baseGold: 4000, baseGems: 6, baseIron: 5, duration: 15 * 60 * 1000 }
];

// 🐉 أمر استدعاء وعرض حالة الزعيم
registerCommand('زعيم', async (ctx) => {
    if (!ctx.isGroup) {
        return ctx.reply('❌ هذا الأمر مخصص للمجموعات فقط للقتال التعاوني!');
    }

    const boss = activeBosses.get(ctx.from);

    // إذا كان هناك زعيم نشط بالفعل
    if (boss) {
        const remaining = boss.duration - (Date.now() - boss.startTime);
        if (remaining <= 0) {
            activeBosses.delete(ctx.from);
            return ctx.reply('⏳ *انتهى الوقت!* لقد هرب الزعيم ولم تتمكنوا من هزيمته في الوقت المحدد. حاولوا لاحقاً بجهد جماعي أكبر! 🐉');
        }

        let statusText = `🐉 *معركة الزعيم نشطة حالياً!* 🐉\n\n`;
        statusText += `👾 الاسم: *${boss.name}*\n`;
        statusText += `❤️ الصحة المتبقية: *${formatNumber(boss.hp)} / ${formatNumber(boss.maxHp)}* HP\n`;
        statusText += `⏳ الوقت المتبقي: *${formatDuration(Math.floor(remaining / 1000))}*\n\n`;
        statusText += `⚔️ للهجوم والقتال اكتب: *.هجوم_زعيم*`;

        const buttons = [
            { id: '.هجوم_زعيم', text: '⚔️ هجوم على الزعيم' },
            { id: '.بروفايل', text: '📊 بروفايلي' }
        ];
        return ctx.replyWithButtons(statusText, 'تعاونوا لهزيمة الوحش وحصد الغنائم!', buttons);
    }

    // استدعاء زعيم جديد
    const now = Date.now();
    const lastSummon = summonCooldowns.get(ctx.from) || 0;
    const cooldown = 1.5 * 60 * 60 * 1000; // مهلة استدعاء ساعة ونصف

    if (now - lastSummon < cooldown) {
        const remaining = cooldown - (now - lastSummon);
        return ctx.reply(`❌ تم استدعاء زعيم مؤخراً في هذه المجموعة! يرجى الانتظار *${formatDuration(Math.floor(remaining / 1000))}* قبل استدعاء زعيم جديد.`);
    }

    // إنشاء وحش عشوائي
    const template = BOSS_TEMPLATES[Math.floor(Math.random() * BOSS_TEMPLATES.length)];
    const newBoss = {
        ...template,
        hp: template.maxHp,
        startTime: now,
        participants: new Set(),
        attackers: {} // JID -> Damage
    };

    activeBosses.set(ctx.from, newBoss);
    summonCooldowns.set(ctx.from, now);

    let text = `🚨 *ظهور زعيم أسطوري مفاجئ!* 🚨\n\n`;
    text += `لقد ظهر *${newBoss.name}* بقوة هائلة لتهديد المجموعة وتدميرها!\n\n`;
    text += `👾 الصحة القصوى: *${formatNumber(newBoss.hp)}* HP\n`;
    text += `⏳ الوقت المحدد للقضاء عليه: *${formatDuration(Math.floor(newBoss.duration / 1000))}*\n\n`;
    text += `⚔️ اكتبوا: *.هجوم_زعيم* فوراً للمشاركة بالقتال وحصد المكافآت الأسطورية!`;

    const buttons = [
        { id: '.هجوم_زعيم', text: '⚔️ هجوم على الزعيم' },
        { id: '.بروفايل', text: '📊 بروفايلي' }
    ];
    await ctx.replyWithButtons(text, 'المعركة تتطلب شجاعة الجميع!', buttons);
}, {
    description: 'عرض حالة الزعيم الحالي أو استدعاء زعيم جديد في المجموعة',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});

// دعم تفعيل أمر تنين كاسم بديل
registerCommand('تنين', async (ctx) => {
    const cmd = commands.get('زعيم');
    if (cmd) await cmd.execute(ctx);
}, {
    description: 'عرض حالة الزعيم أو استدعاء تنين جديد',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});

// ⚔️ أمر مهاجمة الزعيم
registerCommand('هجوم_زعيم', async (ctx) => {
    if (!ctx.isGroup) {
        return ctx.reply('❌ هذا الأمر مخصص للمجموعات فقط للقتال التعاوني!');
    }

    const boss = activeBosses.get(ctx.from);
    if (!boss) {
        return ctx.reply('❌ لا يوجد زعيم نشط حالياً في هذه المجموعة! اكتب *.زعيم* لاستدعاء واحد.');
    }

    const remaining = boss.duration - (Date.now() - boss.startTime);
    if (remaining <= 0) {
        activeBosses.delete(ctx.from);
        return ctx.reply('⏳ *انتهى الوقت!* لقد هرب الزعيم ولم تتمكنوا من هزيمته في الوقت المحدد. حاولوا لاحقاً بجهد جماعي أكبر! 🐉');
    }

    const user = database.getUser(ctx.sender);
    if (user.health < 15) {
        return ctx.reply(`❌ صحتك منخفضة جداً للقتال (*${user.health} HP*)! يرجى شرب جرعة صحة أولاً عبر أمر: *.استخدام جرعة_صحة*`);
    }

    // حساب قوة الهجوم والأضرار
    let damage = user.attack + randomInt(15, 30);
    if (user.class === 'ساحر') {
        damage = Math.round(damage * 1.4); // هجوم سحري خارق
    } else if (user.class === 'سياف') {
        damage = Math.round(damage * 1.15); // هجوم متزن
    }
    // علاوة ترقية السلاح
    damage += (user.weaponLevel || 0) * 8;

    // حساب الصحة المفقودة
    let healthLoss = randomInt(12, 28);
    if (user.class === 'فارس') {
        healthLoss = Math.round(healthLoss * 0.55); // دفاع فولاذي
    } else if (user.class === 'ساحر') {
        healthLoss = Math.round(healthLoss * 1.25); // صحة ضعيفة
    }

    // تطبيق الضرر
    boss.hp = Math.max(0, boss.hp - damage);
    const newHealth = Math.max(0, user.health - healthLoss);

    boss.participants.add(ctx.sender);
    boss.attackers[ctx.sender] = (boss.attackers[ctx.sender] || 0) + damage;

    // تحديث صحة المستخدم
    database.updateUser(ctx.sender, { health: newHealth });

    // تحديث المهام اليومية للاعب إن كانت نشطة ومطابقة
    if (user.activeQuest && !user.activeQuest.completed && user.activeQuest.type === 'duel') {
        const quest = user.activeQuest;
        const nowAssigned = new Date(quest.lastAssigned).toDateString();
        if (nowAssigned === new Date().toDateString()) {
            quest.current = (quest.current || 0) + 1;
            if (quest.current >= quest.target) {
                quest.completed = true;
                database.updateUser(ctx.sender, {
                    wallet: user.wallet + quest.rewardGold,
                    gems: (user.gems || 0) + quest.rewardGems,
                    activeQuest: quest
                });
                await ctx.reply(`🎉 *مبروك! لقد أتممت مهمتك اليومية!* 🎉\n🏆 حصلت على: +${quest.rewardGold} ذهبة و +${quest.rewardGems} جوهرة 💎!`);
            } else {
                database.updateUser(ctx.sender, { activeQuest: quest });
            }
        }
    }

    // التحقق من موت الزعيم وتوزيع الغنائم
    if (boss.hp === 0) {
        // العثور على البطل الأكثر إلحاقاً للضرر MVP
        let mvpJid = null;
        let maxDmg = 0;
        for (const [jid, dmg] of Object.entries(boss.attackers)) {
            if (dmg > maxDmg) {
                maxDmg = dmg;
                mvpJid = jid;
            }
        }

        // توزيع الجوائز على جميع الأبطال المشاركين
        for (const jid of boss.participants) {
            const pUser = database.getUser(jid);
            if (!pUser) continue;

            const isMvp = jid === mvpJid;
            const goldReward = boss.baseGold + (isMvp ? 1500 : 0);
            const gemReward = boss.baseGems + (isMvp ? 4 : 0);
            const ironReward = boss.baseIron + (isMvp ? 2 : 0);

            // تحديث مخزون الحديد
            const userInv = pUser.inventory || [];
            for (let i = 0; i < ironReward; i++) {
                userInv.push('خام_حديد');
            }

            database.updateUser(jid, {
                wallet: pUser.wallet + goldReward,
                gems: (pUser.gems || 0) + gemReward,
                inventory: userInv
            });
        }

        let victoryText = `🎉 *نصر مؤزر وعظيم!* 🎉\n\n`;
        victoryText += `لقد تمكن أبطال المجموعة الأشاوس من دحر وهزيمة الزعيم *${boss.name}* بنجاح! ⚔️🛡️\n\n`;
        victoryText += `👑 *بطل المعركة (MVP):* @${mvpJid.split('@')[0]} بإلحاق ضرر خارق قدره *${maxDmg}* HP!\n`;
        victoryText += `━━━━━━━━━━━━━━━━━\n`;
        victoryText += `🎁 *توزيع الغنائم والجوائز:* 🎁\n`;
        victoryText += `💰 حصل كل بطل مشارك على: *+${formatNumber(boss.baseGold)}* ذهبة، *+${boss.baseGems}* 💎، و *+${boss.baseIron}* خام حديد!\n`;
        victoryText += `👑 البطل MVP حصل على مكافأة إضافية: *+1,500* ذهبة، *+4* 💎، و *+2* خام حديد!\n\n`;
        victoryText += `👥 *سجل ضربات الأبطال:* \n`;

        const mentions = [...boss.participants];
        for (const [jid, dmg] of Object.entries(boss.attackers)) {
            victoryText += `• @${jid.split('@')[0]} ➔ ضرر: *${dmg}* HP\n`;
        }

        activeBosses.delete(ctx.from);
        await ctx.sock.sendMessage(ctx.from, { text: victoryText, mentions }, { quoted: ctx.msg });
    } else {
        // استمرار القتال وعرض رد الفعل
        let hitText = `⚔️ *ضربة قوية على الزعيم!* ⚔️\n\n`;
        hitText += `👤 *المهاجم:* @${ctx.senderNumber}\n`;
        hitText += `💥 *الضرر الملحق:* *${damage}* HP\n`;
        hitText += `💔 *الضرر المستلم:* *-${healthLoss}* HP\n`;
        hitText += `🩺 *صحتك الحالية:* *${newHealth} / ${user.maxHealth}* HP\n`;
        hitText += `─────────────────\n`;
        hitText += `👾 *صحة [ ${boss.name} ] متبقية:* *${formatNumber(boss.hp)} / ${formatNumber(boss.maxHp)}* HP`;

        const buttons = [
            { id: '.هجوم_زعيم', text: '⚔️ هجوم مجدداً' },
            { id: '.استخدام جرعة_صحة', text: '💊 شرب جرعة صحة' }
        ];
        await ctx.replyWithButtons(hitText, 'استمروا في الضرب للقضاء عليه قبل فوات الأوان!', buttons);
    }
}, {
    description: 'المشاركة في القتال الجماعي لضرب الزعيم وتلقي أضرار مقابل جوائز أسطورية',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});

registerCommand('هجوم-زعيم', async (ctx) => {
    const cmd = commands.get('هجوم_زعيم');
    if (cmd) await cmd.execute(ctx);
}, {
    description: 'المشاركة في القتال الجماعي لضرب الزعيم',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});
