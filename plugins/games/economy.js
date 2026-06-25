import { registerCommand } from '../../lib/handler.js';
import { database } from '../../lib/db.js';
import { formatNumber, formatDuration } from '../../lib/utils.js';
import config from '../../config.js';

// دالة لإنشاء شريط صحة مرئي جمالي
function createHealthBar(health, max) {
    const percentage = Math.min(100, Math.max(0, Math.floor((health / max) * 100)));
    const totalBlocks = 10;
    const filledBlocks = Math.round((percentage / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    
    const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
    return `[${bar}] ${percentage}%`;
}

// 👤 عرض الملف الشخصي المطور (RPG & Economy Profile)
registerCommand('بروفايل', async (ctx) => {
    let target = ctx.sender;
    let targetNumber = ctx.senderNumber;

    if (ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        targetNumber = target.split('@')[0];
    } else if (ctx.msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.participant;
        targetNumber = target.split('@')[0];
    }

    const user = database.getUser(target);
    const xpNeeded = user.level * 150;
    
    // شريط الصحة والترتيب
    const hpBar = createHealthBar(user.health || 100, user.maxHealth || 100);
    const rank = user.rank || 'مبتدئ';

    // استخراج السلاح النشط ومستوى ترقيته
    const inventory = user.inventory || [];
    let activeWeapon = 'قبضة اليد 👊';
    if (inventory.includes('سيف_الفرسان')) {
        activeWeapon = '⚔️ سيف الفرسان الملكي';
    } else if (inventory.includes('سيف_فولاذي')) {
        activeWeapon = '⚔️ سيف فولاذي';
    } else if (inventory.includes('سيف_برونزي')) {
        activeWeapon = '⚔️ سيف برونزي';
    }

    if (user.weaponLevel > 0 && activeWeapon !== 'قبضة اليد 👊') {
        activeWeapon += ` +${user.weaponLevel}`;
    }

    let profileText = `🛡️ *بطاقة تعريف بطل: [ @${targetNumber} ]* 🛡️\n`;
    if (user.title) {
        profileText += `👑 *اللقب الملكي:* [ *${user.title}* ]\n`;
    }
    profileText += `🎭 *الرتبة القتالية:* *[ ${rank} ]*\n`;
    profileText += `🎭 *الفئة القتالية:* *[ ${user.class || 'بدون'} ]*\n`;
    profileText += `━━━━━━━━━━━━━━━━━\n\n`;

    profileText += `🩺 *مؤشر الصحة (HP):*\n   ${hpBar} (${user.health || 100} / ${user.maxHealth || 100} HP)\n\n`;
    profileText += `⚔️ *القوة القتالية:*\n`;
    profileText += `   🗡️ الهجوم: *${user.attack || 10}* | 🛡️ الدفاع: *${user.defense || 5}*\n`;
    profileText += `   ⚔️ السلاح النشط: *${activeWeapon}*\n\n`;

    profileText += `📊 *المستوى:* مستوى *${user.level}*\n`;
    profileText += `✨ *الخبرة (XP):* *${user.xp}* / *${xpNeeded}* XP\n\n`;

    profileText += `💰 *المال والقدرات:*\n`;
    profileText += `   💵 المحفظة: *${formatNumber(user.wallet)}* عملة ذهبية\n`;
    profileText += `   🏦 البنك: *${formatNumber(user.bank)}* عملة ذهبية\n`;
    profileText += `   💎 الجواهر المميزة: *${formatNumber(user.gems || 0)}* جوهرة\n\n`;

    if (user.partner) {
        profileText += `💍 *الشريك:* @${user.partner.split('@')[0]}\n`;
    }
    if (user.clan) {
        profileText += `🏰 *التحالف:* [ *${user.clan}* ]\n`;
    }

    // عرض المخزن
    if (inventory.length > 0) {
        const itemCounts = {};
        inventory.forEach(i => { itemCounts[i] = (itemCounts[i] || 0) + 1; });
        
        let invText = '';
        for (const [id, count] of Object.entries(itemCounts)) {
            invText += `🔹 ${id.replace(/_/g, ' ')} (x${count})\n`;
        }
        profileText += `📦 *المخزن الشخصي (Inventory):*\n${invText}`;
    } else {
        profileText += `📦 *المخزن الشخصي:* فارغ حالياً.`;
    }

    const mentions = [target];
    if (user.partner) mentions.push(user.partner);

    const buttons = [
        { text: '💼 اذهب للعمل', id: '.عمل' },
        { text: '⛏️ تعدين الذهب', id: '.تعدين' },
        { text: '🛒 المتجر الافتراضي', id: '.متجر' }
    ];

    const profileHeader = `⚔️ ─── *${config.botName}* ─── ⚔️\n\n` + profileText;
    await ctx.sendButtons(profileHeader, 'أظهر قوتك وثروتك أمام الأبطال الآخرين!', buttons, { mentions });
}, {
    description: 'عرض بروفايلك الشخصي المطور وعتادك الحربي وصحتك وثروتك',
    category: '🎮 ألعاب وتسلية'
});

// 🎁 المكافأة اليومية (Daily Reward)
registerCommand('يومي', async (ctx) => {
    const user = database.getUser(ctx.sender);
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 ساعة

    if (now - user.lastDaily < cooldown) {
        const remaining = cooldown - (now - user.lastDaily);
        return ctx.reply(`⚠️ لقد طالبت بمكافأتك اليومية بالفعل! يرجى الانتظار *${formatDuration(Math.floor(remaining / 1000))}* للمطالبة مجدداً.`);
    }

    const reward = Math.floor(Math.random() * 500) + 200; // 200 - 700 عملة
    database.updateUser(ctx.sender, {
        wallet: user.wallet + reward,
        lastDaily: now
    });

    let dailyText = `🎁 *المطالبة بالمكافأة اليومية الملكية* 🎁\n\n`;
    dailyText += `لقد فتحت الصندوق الملكي اليومي وحصلت على:\n`;
    dailyText += `💰 الجائزة: *+${reward}* عملة ذهبية!\n\n`;
    dailyText += `محفظتك الحالية: *${formatNumber(user.wallet + reward)}* ذهبة.`;

    const buttons = [
        { text: '📊 بروفايلي', id: '.بروفايل' },
        { text: '🛒 المتجر الافتراضي', id: '.متجر' }
    ];

    await ctx.sendButtons(dailyText, 'احرص على المطالبة بذهبك كل يوم للاستمرار بالتطور!', buttons);
}, {
    description: 'المطالبة بالذهب والهدية اليومية المجانية من البوت',
    category: '🎮 ألعاب وتسلية'
});

// 🏦 الإيداع في البنك
registerCommand('ايداع', async (ctx) => {
    const amountStr = ctx.args[0];
    if (!amountStr) return ctx.reply('❌ يرجى تحديد المبلغ المراد إيداعه أو اكتب: *.ايداع الكل*');

    const user = database.getUser(ctx.sender);
    let amount = 0;

    if (amountStr === 'الكل') {
        amount = user.wallet;
    } else {
        amount = parseInt(amountStr);
    }

    if (isNaN(amount) || amount <= 0) return ctx.reply('❌ يرجى إدخال مبلغ صحيح أكبر من الصفر للإيداع!');
    if (user.wallet < amount) return ctx.reply('❌ ليس لديك هذا الذهب الكافي في محفظتك!');

    database.updateUser(ctx.sender, {
        wallet: user.wallet - amount,
        bank: user.bank + amount
    });

    let depositText = `🏦 *إيداع بنكي ناجح* 🏦\n\n`;
    depositText += `تم نقل الذهب بأمان من محفظتك إلى خزنة البنك الملكي:\n`;
    depositText += `💰 ذهب مودع: *${formatNumber(amount)}* عملة ذهبية\n`;
    depositText += `💵 محفظتك الحالية: *${formatNumber(user.wallet - amount)}*\n`;
    depositText += `🏦 حسابك البنكي: *${formatNumber(user.bank + amount)}*`;

    const buttons = [
        { text: '💸 سحب كل الأموال', id: '.سحب الكل' },
        { text: '📊 بروفايلي', id: '.بروفايل' }
    ];

    await ctx.sendButtons(depositText, 'الذهب المودع في البنك محمي تماماً من سرقات اللصوص!', buttons);
}, {
    description: 'إيداع الذهب في البنك لحمايته بالكامل من اللصوص والسرقة',
    category: '🎮 ألعاب وتسلية'
});

// 🏦 السحب من البنك
registerCommand('سحب', async (ctx) => {
    const amountStr = ctx.args[0];
    if (!amountStr) return ctx.reply('❌ يرجى تحديد المبلغ المراد سحبه أو اكتب: *.سحب الكل*');

    const user = database.getUser(ctx.sender);
    let amount = 0;

    if (amountStr === 'الكل') {
        amount = user.bank;
    } else {
        amount = parseInt(amountStr);
    }

    if (isNaN(amount) || amount <= 0) return ctx.reply('❌ يرجى إدخال مبلغ صحيح أكبر من الصفر للسحب!');
    if (user.bank < amount) return ctx.reply('❌ ليس لديك هذا الذهب الكافي في حسابك البنكي!');

    database.updateUser(ctx.sender, {
        wallet: user.wallet + amount,
        bank: user.bank - amount
    });

    let withdrawText = `🏦 *سحب بنكي ناجح* 🏦\n\n`;
    withdrawText += `لقد سحبت الذهب من خزنة البنك الملكي إلى محفظتك الشخصية:\n`;
    withdrawText += `💰 ذهب مسحوب: *${formatNumber(amount)}* عملة ذهبية\n`;
    withdrawText += `💵 محفظتك الحالية: *${formatNumber(user.wallet + amount)}*\n`;
    withdrawText += `🏦 حسابك البنكي: *${formatNumber(user.bank - amount)}*`;

    const buttons = [
        { text: '🛒 المتجر الافتراضي', id: '.متجر' },
        { text: '📊 بروفايلي', id: '.بروفايل' }
    ];

    await ctx.sendButtons(withdrawText, 'استخدم الذهب المسحوب بحكمة لتطوير عتادك!', buttons);
}, {
    description: 'سحب الذهب من البنك إلى محفظتك لاستخدامه في الشراء',
    category: '🎮 ألعاب وتسلية'
});
