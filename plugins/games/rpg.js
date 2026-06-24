import { registerCommand, commands } from '../../lib/handler.js';
import { database } from '../../lib/db.js';
import { randomInt, formatNumber, formatDuration } from '../../lib/utils.js';

// قوالب المهام اليومية
const QUEST_TYPES = [
    { type: 'work', desc: 'العمل في المدينة 3 مرات اليوم', target: 3, rewardGold: 500, rewardGems: 2 },
    { type: 'mine', desc: 'التعدين في المناجم 2 مرات اليوم', target: 2, rewardGold: 600, rewardGems: 3 },
    { type: 'steal', desc: 'تنفيذ عملية سرقة أو سطو ناجحة اليوم', target: 1, rewardGold: 800, rewardGems: 4 },
    { type: 'duel', desc: 'خوض مبارزة ثنائية أو هجوم على زعيم اليوم', target: 2, rewardGold: 1000, rewardGems: 5 }
];

// معالج تحديث تقدم المهام اليومية
const checkQuestProgress = async (ctx, type) => {
    const user = database.getUser(ctx.sender);
    if (user.activeQuest && !user.activeQuest.completed && user.activeQuest.type === type) {
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
};

// ذاكرة مؤقتة للمبارزات المعلقة (المستهدف -> { proposer: JID, wager: number })
const pendingDuels = new Map();
// ذاكرة مؤقتة لطلبات الزواج المعلقة (المستهدف -> المرسل)
const pendingMarriages = new Map();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛒 متجر الأدوات والأسلحة والجرعات
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SHOP_ITEMS = {
    'جرعة_صحة': { name: '💊 جرعة صحة', cost: 300, desc: 'تعيد لك 50 نقطة من الصحة (HP)' },
    'سيف_برونزي': { name: '⚔️ سيف برونزي', cost: 1000, desc: 'يزيد الهجوم بـ +5 ويرقيك لرتبة [محارب]', attack: 5, rank: 'محارب' },
    'سيف_فولاذي': { name: '⚔️ سيف فولاذي', cost: 2500, desc: 'يزيد الهجوم بـ +15 ويرقيك لرتبة [فارس]', attack: 15, rank: 'فارس' },
    'سيف_الفرسان': { name: '⚔️ سيف الفرسان الملكي', cost: 6000, desc: 'يزيد الهجوم بـ +35 ويرقيك لرتبة [بطل أسطوري]', attack: 35, rank: 'بطل أسطوري' },
    'درع_حديدي': { name: '🛡️ درع حديدي', cost: 1200, desc: 'يزيد الدفاع بـ +5 لحمايتك في القتال', defense: 5 },
    'درع_ملكي': { name: '🛡️ درع ملكي فاخر', cost: 4000, desc: 'يزيد الدفاع بـ +15 لقوة تحمل خارقة', defense: 15 },
    'درع_حماية': { name: '🔮 درع الحماية من السرقة', cost: 1500, desc: 'يمنع سرقة أموالك من قبل اللصوص لمرة واحدة' }
};

registerCommand('متجر', async (ctx) => {
    let shopText = `🛒 *متجر الأسلحة والعتاد لـ ${ctx.sock.user.name || 'KnightBot'}* 🛒\n\n`;
    shopText += `استخدم الذهب لشراء السلع وتطوير قدراتك القتالية!\n`;
    shopText += `━━━━━━━━━━━━━━━━━\n\n`;

    for (const [id, item] of Object.entries(SHOP_ITEMS)) {
        shopText += `${item.name} [\`${id}\`]\n`;
        shopText += `💰 السعر: *${formatNumber(item.cost)}* عملة ذهبية\n`;
        shopText += `📝 التأثير: ${item.desc}\n`;
        shopText += `─────────────────\n`;
    }
    shopText += `\n💡 للشراء اكتب: *.شراء [اسم السلعة]*\nمثال: *.شراء جرعة_صحة*`;

    const buttons = [
        { id: '.بروفايل', text: '📊 بروفايلي' },
        { id: '.شراء جرعة_صحة', text: '💊 شراء جرعة صحة' },
        { id: '.عمل', text: '💼 اذهب للعمل' }
    ];

    await ctx.replyWithButtons(shopText, 'تسوق بحكمة وطوّر عتادك!', buttons);
}, {
    description: 'عرض متجر البوت لشراء الأسلحة والدروع والجرعات',
    category: '🎮 ألعاب وتسلية'
});

registerCommand('شراء', async (ctx) => {
    const itemId = ctx.args[0];
    if (!itemId || !SHOP_ITEMS[itemId]) {
        return ctx.reply('❌ يرجى تحديد اسم السلعة من المتجر بشكل صحيح!\nمثال: *.شراء جرعة_صحة*');
    }

    const item = SHOP_ITEMS[itemId];
    const user = database.getUser(ctx.sender);

    if (user.wallet < item.cost) {
        return ctx.reply(`❌ ذهبك لا يكفي لشراء ${item.name}!\n💰 السعر: *${formatNumber(item.cost)}* | ذهبك الحالي: *${formatNumber(user.wallet)}*`);
    }

    const inventory = user.inventory || [];
    
    // شروط الأسلحة والدروع (شراء نسخة واحدة فقط)
    if (itemId.startsWith('سيف_') || itemId.startsWith('درع_')) {
        if (itemId !== 'درع_حماية' && inventory.includes(itemId)) {
            return ctx.reply(`❌ أنت تمتلك بالفعل ${item.name} في مخزنك!`);
        }
    }

    // تحديث المحفظة والمخزن
    const updatedInv = [...inventory, itemId];
    const updates = {
        wallet: user.wallet - item.cost,
        inventory: updatedInv
    };

    // تطبيق المكافآت/الترقيات الفورية
    if (item.attack) updates.attack = Math.max(user.attack, 10 + item.attack);
    if (item.defense) updates.defense = Math.max(user.defense, 5 + item.defense);
    if (item.rank) updates.rank = item.rank;
    if (itemId === 'درع_حماية') updates.shield = (user.shield || 0) + 1;

    database.updateUser(ctx.sender, updates);

    await ctx.reply(`✅ تم شراء *${item.name}* بنجاح! 💸\n💰 تم خصم *${formatNumber(item.cost)}* عملة ذهبية من محفظتك.`);
}, {
    description: 'شراء السلع والعتاد من المتجر الافتراضي',
    category: '🎮 ألعاب وتسلية'
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💼 نظام العمل المطور (Work)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
registerCommand('عمل', async (ctx) => {
    const user = database.getUser(ctx.sender);
    const now = Date.now();
    const cooldown = 5 * 60 * 1000; // 5 دقائق

    if (now - user.lastWork < cooldown) {
        const remaining = cooldown - (now - user.lastWork);
        return ctx.reply(`⏳ أنت متعب من العمل السابق! يرجى الانتظار *${formatDuration(Math.floor(remaining / 1000))}* للعمل مجدداً.`);
    }

    // رواتب وسيناريوهات مختلفة بناءً على الرتبة القتالية
    let reward = randomInt(150, 300);
    let xpGain = randomInt(20, 40);
    let workDesc = '';

    const rank = user.rank || 'مبتدئ';

    if (rank === 'بطل أسطوري') {
        reward = randomInt(600, 1000);
        xpGain = randomInt(50, 100);
        const scenarios = [
            '🐉 قمت بقتل التنين الثائر الذي هدد القلعة الملكية، كافئك الملك بصندوق ذهب!',
            '🏛️ قدت هجوماً مظفراً لحماية المملكة من قوى الظلام وحصلت على غنائم الحرب.'
        ];
        workDesc = scenarios[Math.floor(Math.random() * scenarios.length)];
    } else if (rank === 'فارس') {
        reward = randomInt(400, 600);
        xpGain = randomInt(35, 70);
        const scenarios = [
            '🐎 قمت بتأمين موكب التجار الملكي من قطاع الطرق الشرسين.',
            '🏰 قمت بحراسة قاعة العرش وإلقاء القبض على جاسوس متسلل.'
        ];
        workDesc = scenarios[Math.floor(Math.random() * scenarios.length)];
    } else if (rank === 'محارب') {
        reward = randomInt(250, 400);
        xpGain = randomInt(25, 50);
        const scenarios = [
            '⚔️ شاركت في تدريب جيش الفرسان الجدد وأظهرت مهارة عالية.',
            '🐺 قمت بتطهير المزارع المحيطة بالمدينة من الذئاب البرية الجائعة.'
        ];
        workDesc = scenarios[Math.floor(Math.random() * scenarios.length)];
    } else {
        // مبتدئ
        const scenarios = [
            '🌾 قمت بحصاد حقول القمح ونقلها لمخازن المدينة.',
            '🧹 قمت بتنظيف إسطبلات خيول الفرسان الملكية براتب بسيط.',
            '⛏️ ساعدت الحداد المحلي في نفخ النيران وصقل الحشايا البرونزية.'
        ];
        workDesc = scenarios[Math.floor(Math.random() * scenarios.length)];
    }

    const nextXp = user.level * 150;
    let newXp = user.xp + xpGain;
    let newLevel = user.level;
    let lvlUpText = '';

    if (newXp >= nextXp) {
        newLevel += 1;
        newXp = newXp - nextXp;
        lvlUpText = `\n\n🎉 *ترقية!* لقد ارتفع مستواك إلى *[ ${newLevel} ]* 🚀`;
    }

    database.updateUser(ctx.sender, {
        wallet: user.wallet + reward,
        xp: newXp,
        level: newLevel,
        lastWork: now
    });

    await checkQuestProgress(ctx, 'work');

    let resultText = `💼 *مهمة عمل ناجحة (${rank})* 💼\n\n`;
    resultText += `${workDesc}\n\n`;
    resultText += `💰 الأرباح المكتسبة: *+${reward}* عملة ذهبية\n`;
    resultText += `✨ الخبرة المكتسبة: *+${xpGain}* XP${lvlUpText}`;

    const buttons = [
        { id: '.بروفايل', text: '📊 بروفايلي' },
        { id: '.تعدين', text: '⛏️ اذهب للتعدين' },
        { id: '.متجر', text: '🛒 المتجر' }
    ];

    await ctx.replyWithButtons(resultText, 'استمر في العمل لزيادة قوتك وثروتك!', buttons);
}, {
    description: 'الذهاب للعمل وكسب الذهب والخبرة حسب رتبتك',
    category: '🎮 ألعاب وتسلية'
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⛏️ نظام التعدين المطور (Mining)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
registerCommand('تعدين', async (ctx) => {
    const user = database.getUser(ctx.sender);
    const now = Date.now();
    const cooldown = 10 * 60 * 1000; // 10 دقائق

    if (now - user.lastMine < cooldown) {
        const remaining = cooldown - (now - user.lastMine);
        return ctx.reply(`⏳ المناجم خطرة وتحتاج للراحة! يرجى الانتظار *${formatDuration(Math.floor(remaining / 1000))}* قبل النزول للمناجم.`);
    }

    if (user.health < 25) {
        return ctx.reply(`❌ صحتك منخفضة جداً قتالياً وحياتياً (*${user.health} HP*)! قد تموت في المناجم. استخدم جرعة صحة أولاً عبر أمر: *.استخدام جرعة_صحة*`);
    }

    // 70% نجاح، 30% هجوم وحوش وخسارة صحة
    const roll = Math.random();
    if (roll < 0.70) {
        const reward = randomInt(400, 850);
        const xpGain = randomInt(30, 60);

        const nextXp = user.level * 150;
        let newXp = user.xp + xpGain;
        let newLevel = user.level;
        let lvlUpText = '';

        if (newXp >= nextXp) {
            newLevel += 1;
            newXp = newXp - nextXp;
            lvlUpText = `\n\n🎉 *ترقية!* لقد ارتفع مستواك إلى *[ ${newLevel} ]* 🚀`;
        }

        let ironGain = 0;
        if (Math.random() < 0.40) {
            ironGain = randomInt(1, 2);
        }

        const inventory = user.inventory || [];
        for (let i = 0; i < ironGain; i++) {
            inventory.push('خام_حديد');
        }

        database.updateUser(ctx.sender, {
            wallet: user.wallet + reward,
            xp: newXp,
            level: newLevel,
            lastMine: now,
            inventory: inventory
        });

        await checkQuestProgress(ctx, 'mine');

        let resultText = `⛏️ *عملية تعدين ناجحة* ⛏️\n\n`;
        resultText += `لقد نزلت لأعماق الكهوف وضربت الفأس بالصخور الصلبة حتى لمع بريق الذهب وخام الحديد!\n\n`;
        resultText += `💰 الذهب المستخرج: *+${reward}* عملة ذهبية\n`;
        if (ironGain > 0) {
            resultText += `🧱 الحديد المستخرج: *+${ironGain}* خام حديد 🧱\n`;
        }
        resultText += `✨ الخبرة المكتسبة: *+${xpGain}* XP${lvlUpText}`;

        const buttons = [
            { id: '.بروفايل', text: '📊 بروفايلي' },
            { id: '.عمل', text: '💼 عمل عادي' }
        ];
        await ctx.replyWithButtons(resultText, 'التعدين يجلب ثروة أكبر للمغامر الصبور!', buttons);
    } else {
        // فشل وهجوم وحش
        const hpLoss = randomInt(20, 35);
        const remainingHp = Math.max(0, user.health - hpLoss);

        database.updateUser(ctx.sender, {
            health: remainingHp,
            lastMine: now
        });

        let failText = `🚨 *كارثة في المنجم!* 🚨\n\n`;
        failText += `بينما كنت تبحث عن الذهب، انهار حائط صخري وهاجمتك *عناكب منجم عملاقة*! 🕷️\n`;
        failText += `💔 الأضرار: فقدت *${hpLoss}* من صحتك (HP).\n`;
        failText += `🩺 صحتك الحالية: *${remainingHp} / ${user.maxHealth}* HP`;

        if (remainingHp === 0) {
            failText += `\n💀 لقد أغمي عليك ونُقلت لدار الشفاء الملكية. فقدت 200 ذهبة كأجر للعلاج.`;
            database.updateUser(ctx.sender, {
                wallet: Math.max(0, user.wallet - 200),
                health: 30 // إنعاش بصحة منخفضة
            });
        }

        const buttons = [
            { id: '.استخدام جرعة_صحة', text: '💊 شرب جرعة صحة' },
            { id: '.متجر', text: '🛒 شراء جرعات' }
        ];

        await ctx.replyWithButtons(failText, 'احذر من مخاطر الظلام واستعد دائماً بالجرعات!', buttons);
    }
}, {
    description: 'النزول للمناجم لاستخراج الذهب مع التعرض لمخاطر الوحوش',
    category: '🎮 ألعاب وتسلية'
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🦹 نظام الجرائم المطور (Crime)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
registerCommand('جريمة', async (ctx) => {
    const user = database.getUser(ctx.sender);
    const now = Date.now();
    const cooldown = 15 * 60 * 1000; // 15 دقيقة

    if (now - user.lastCrime < cooldown) {
        const remaining = cooldown - (now - user.lastCrime);
        return ctx.reply(`⏳ الحراس يراقبون المنطقة بنشاط! يرجى الاختباء والانتظار *${formatDuration(Math.floor(remaining / 1000))}*.`);
    }

    // 50% نجاح، 50% فشل
    const roll = Math.random();
    if (roll < 0.50) {
        // نجاح
        const reward = randomInt(800, 1600);
        database.updateUser(ctx.sender, {
            wallet: user.wallet + reward,
            lastCrime: now
        });

        await checkQuestProgress(ctx, 'steal');

        let crimeText = `🦹 *عملية سطو وجريمة ناجحة* 🔥\n\n`;
        crimeText += `لقد خططت لسرقة عربة خزانة الضرائب الملكية الفاخرة ونفذت السطو بنجاح هاربًا بالذهب!\n\n`;
        crimeText += `💰 الغنائم: *+${formatNumber(reward)}* عملة ذهبية!`;

        const buttons = [
            { id: '.ايداع الكل', text: '🏦 إيداع الذهب بالبنك' },
            { id: '.بروفايل', text: '📊 بروفايلي' }
        ];
        await ctx.replyWithButtons(crimeText, 'احمِ غنائمك في البنك فوراً قبل أن تُسرق منك!', buttons);
    } else {
        // فشل
        const fine = Math.min(user.wallet, randomInt(300, 700));
        database.updateUser(ctx.sender, {
            wallet: user.wallet - fine,
            lastCrime: now
        });

        let jailText = `👮 *تم القبض عليك متلبسًا!* 🚔\n\n`;
        jailText += `حاصر القوات الملكية مخبأك السري أثناء محاولتك السطو على المتجر الكبير.\n\n`;
        jailText += `💸 العقوبة: تم فرض غرامة مالية عليك قدرها *${formatNumber(fine)}* عملة ذهبية!\n`;
        jailText += `💰 محفظتك الآن: *${formatNumber(user.wallet - fine)}* عملة.`;

        const buttons = [
            { id: '.عمل', text: '💼 عمل حلال' },
            { id: '.متجر', text: '🛒 المتجر' }
        ];
        await ctx.replyWithButtons(jailText, 'الحياة الإجرامية محفوفة بالمخاطر القاتلة!', buttons);
    }
}, {
    description: 'تنفيذ جريمة وسرقة عالية المخاطر لكسب ذهب كثير أو دفع غرامات',
    category: '🎮 ألعاب وتسلية'
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🩹 استخدام وشرب جرعات الصحة (Heal)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
registerCommand('استخدام', async (ctx) => {
    const item = ctx.args[0];
    if (!item || item !== 'جرعة_صحة') {
        return ctx.reply('❌ يرجى إدخال اسم السلعة الصحيح لاستخدامها!\n👉 مثال: *.استخدام جرعة_صحة*');
    }

    const user = database.getUser(ctx.sender);
    const inventory = user.inventory || [];

    const index = inventory.indexOf('جرعة_صحة');
    if (index === -1) {
        return ctx.reply('❌ أنت لا تملك أي جرعة صحة في مخزنك! اذهب للمتجر لشراء واحدة عبر: *.شراء جرعة_صحة*');
    }

    if (user.health >= user.maxHealth) {
        return ctx.reply('💖 صحتك كاملة بالفعل! لا داعي لهدر جرعة الصحة.');
    }

    inventory.splice(index, 1);
    const healedHp = Math.min(user.maxHealth, user.health + 50);

    database.updateUser(ctx.sender, {
        health: healedHp,
        inventory: inventory
    });

    await ctx.reply(`💊 *تم استخدام جرعة الصحة بنجاح!* 🩹\n❤️ تم استعادة 50 نقطة صحة.\n🩺 صحتك الحالية الآن: *${healedHp} / ${user.maxHealth}* HP.`);
}, {
    description: 'استخدام جرعة صحة من مخزنك لاستعادة الصحة',
    category: '🎮 ألعاب وتسلية'
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚔️ نظام القتال والمبارزة الثنائي (Live PVP Duel)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
registerCommand('مبارزة', async (ctx) => {
    let target = null;
    if (ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (ctx.msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.participant;
    }

    // الدعم الفرعي لـ قبول/رفض
    const sub = ctx.args[0];
    if (sub === 'قبول') {
        return handleAcceptDuel(ctx);
    }

    if (!target) {
        return ctx.reply('❌ يرجى منشن الشخص الذي تود مبارزته أو الرد على رسالته!\n👉 مثال: *.مبارزة @شخص 500* (اختياري رهان الذهب)');
    }
    if (target === ctx.sender) {
        return ctx.reply('😅 لا يمكنك مبارزة نفسك! تدرب في صالة الألعاب الرياضية بدلاً من ذلك.');
    }

    const wager = Math.max(0, parseInt(ctx.args[1] || '0'));
    const challenger = database.getUser(ctx.sender);
    const opponent = database.getUser(target);

    if (challenger.health < 30) {
        return ctx.reply('❌ صحتك منخفضة جداً للقتال! اشرب جرعة صحة أولاً.');
    }
    if (opponent.health < 30) {
        return ctx.reply('❌ الخصم مصاب حالياً ولا يستطيع المبارزة!');
    }

    if (wager > 0) {
        if (challenger.wallet < wager) {
            return ctx.reply(`❌ ليس لديك رهان الذهب الكافي في محفظتك! تحتاج لـ *${wager}* ذهبة.`);
        }
        if (opponent.wallet < wager) {
            return ctx.reply(`❌ الخصم لا يملك رهان الذهب المطلوب (*${wager}* ذهبة).`);
        }
    }

    pendingDuels.set(target, { proposer: ctx.sender, wager });

    let duelMsg = `⚔️ *تحدي مبارزة ملكي* ⚔️\n\n`;
    duelMsg += `@${ctx.senderNumber} يرفع سيفه ويتحداك يا @${target.split('@')[0]} في قتال مميت!\n`;
    if (wager > 0) {
        duelMsg += `💰 رهان الذهب المقترح: *${formatNumber(wager)}* عملة ذهبية!\n`;
    }
    duelMsg += `\n👉 للقبول وبدء المعركة، اكتب: *.مبارزة قبول* أو اضغط على الزر أدناه.`;

    const buttons = [
        { id: '.مبارزة قبول', text: '⚔️ قبول التحدي والقتال' }
    ];

    await ctx.replyWithButtons(duelMsg, 'المعركة تحسم السيف والمجد!', buttons);
}, {
    description: 'تحدي لاعب آخر لمبارزة ثنائية حية على رهان مالي وخبرة',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});

async function handleAcceptDuel(ctx) {
    const targetJid = ctx.sender;
    const challenge = pendingDuels.get(targetJid);

    if (!challenge) {
        return ctx.reply('❌ ليس لديك أي طلبات مبارزة معلقة حالياً!');
    }

    const proposerJid = challenge.proposer;
    const wager = challenge.wager;

    const challenger = database.getUser(proposerJid);
    const opponent = database.getUser(targetJid);

    if (challenger.health < 20 || opponent.health < 20) {
        pendingDuels.delete(targetJid);
        return ctx.reply('❌ أحد المبارزين مصاب للغاية، تم إلغاء المبارزة.');
    }

    if (wager > 0) {
        if (challenger.wallet < wager || opponent.wallet < wager) {
            pendingDuels.delete(targetJid);
            return ctx.reply('❌ تراجع أحد الأطراف في رهان الذهب، تم إلغاء التحدي.');
        }
    }

    pendingDuels.delete(targetJid);

    // بدء محاكاة القتال المستندة إلى الدور (Turn-based Live Simulation)
    let hpA = challenger.health;
    let hpB = opponent.health;
    const attA = challenger.attack || 10;
    const defA = challenger.defense || 5;
    const attB = opponent.attack || 10;
    const defB = opponent.defense || 5;

    const numA = proposerJid.split('@')[0];
    const numB = targetJid.split('@')[0];

    let duelReport = `⚔️ *انطلاق المبارزة الكبرى!* ⚔️\n`;
    duelReport += `🛡️ @${numA} [HP: ${hpA} | ATK: ${attA}] ضد @${numB} [HP: ${hpB} | ATK: ${attB}]\n`;
    if (wager > 0) duelReport += `💰 الرهان: *${formatNumber(wager)}* ذهبة.\n`;
    duelReport += `━━━━━━━━━━━━━━━━━\n\n`;

    let round = 1;
    while (hpA > 0 && hpB > 0 && round <= 5) {
        // دور المهاجم الأول (A)
        const dmgA = Math.max(3, randomInt(attA - 2, attA + 5) - Math.floor(defB / 2));
        hpB = Math.max(0, hpB - dmgA);
        duelReport += `🗡️ *الجولة ${round}:* يضرب @${numA} خصمه بسيفه ويسدد *${dmgA}* ضرر.\n`;
        duelReport += `🩺 صحة @${numB}: *${hpB}* HP\n`;

        if (hpB <= 0) break;

        // دور المهاجم الثاني (B)
        const dmgB = Math.max(3, randomInt(attB - 2, attB + 5) - Math.floor(defA / 2));
        hpA = Math.max(0, hpA - dmgB);
        duelReport += `⚔️ *الجولة ${round}:* يرد @${numB} بهجوم مضاد عنيف ويسدد *${dmgB}* ضرر.\n`;
        duelReport += `🩺 صحة @${numA}: *${hpA}* HP\n`;

        duelReport += `─────────────────\n`;
        round++;
    }

    // تحديد الفائز والخاسر
    let winnerJid = null;
    let loserJid = null;
    let winnerNum = '';
    let loserNum = '';
    let winnerNewHp = 100;
    let loserNewHp = 0;

    if (hpA > hpB) {
        winnerJid = proposerJid;
        loserJid = targetJid;
        winnerNum = numA;
        loserNum = numB;
        winnerNewHp = hpA;
        loserNewHp = Math.max(10, hpB); // الخاسر لا تموت صحته بالكامل بل تتدنى
    } else {
        winnerJid = targetJid;
        loserJid = proposerJid;
        winnerNum = numB;
        loserNum = numA;
        winnerNewHp = hpB;
        loserNewHp = Math.max(10, hpA);
    }

    const winnerDb = database.getUser(winnerJid);
    const loserDb = database.getUser(loserJid);

    const xpWon = randomInt(40, 80);
    const nextXp = winnerDb.level * 150;
    let newXp = winnerDb.xp + xpWon;
    let newLevel = winnerDb.level;
    let lvlUpText = '';

    if (newXp >= nextXp) {
        newLevel += 1;
        newXp = newXp - nextXp;
        lvlUpText = `\n🔥 ارتفع مستوى البطل *@${winnerNum}* إلى *[ ${newLevel} ]*!`;
    }

    // تطبيق تحديث المحفظة والصحة
    let wagerText = '';
    if (wager > 0) {
        database.updateUser(winnerJid, { wallet: winnerDb.wallet + wager });
        database.updateUser(loserJid, { wallet: loserDb.wallet - wager });
        wagerText = `💰 وغنم رهان القتال بقيمة *${formatNumber(wager)}* عملة ذهبية!`;
    } else {
        // سرقة 10% تلقائياً من محفظة الخاسر كغنيمة معركة عادية
        const bounty = Math.round(loserDb.wallet * 0.10);
        if (bounty > 0) {
            database.updateUser(winnerJid, { wallet: winnerDb.wallet + bounty });
            database.updateUser(loserJid, { wallet: loserDb.wallet - bounty });
            wagerText = `💰 وغنم *${formatNumber(bounty)}* ذهبة من محفظة الخاسر!`;
        }
    }

    // تحديث الإحصائيات النهائية للمبارزين
    database.updateUser(winnerJid, {
        health: winnerNewHp,
        xp: newXp,
        level: newLevel
    });
    database.updateUser(loserJid, {
        health: loserNewHp
    });

    await checkQuestProgress({ ...ctx, sender: winnerJid, senderNumber: winnerNum }, 'duel');
    await checkQuestProgress({ ...ctx, sender: loserJid, senderNumber: loserNum }, 'duel');

    duelReport += `\n👑 *نهاية القتال!* 👑\n\n`;
    duelReport += `🏆 البطل المنتصر هو: *@${winnerNum}* بعد معركة بطولية!\n`;
    duelReport += `✨ حصل المنتصر على *+${xpWon}* نقاط خبرة ${wagerText}${lvlUpText}\n`;
    duelReport += `💔 صحة الخاسر @${loserNum} تدهورت إلى: *${loserNewHp}* HP.`;

    const buttons = [
        { id: '.بروفايل', text: '📊 بروفايلي' },
        { id: '.متجر', text: '🛒 المتجر لجرعات الشفاء' }
    ];

    await ctx.sock.sendMessage(ctx.from, {
        text: duelReport,
        mentions: [proposerJid, targetJid]
    }, { quoted: ctx.msg });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💍 نظام الزواج والارتباط والطلاق الفخم
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
registerCommand('زواج', async (ctx) => {
    let target = null;
    if (ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (ctx.msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.participant;
    }

    if (!target) return ctx.reply('❌ يرجى الإشارة للشريك (منشن) أو الرد على رسالته لعرض الزواج!');
    if (target === ctx.sender) return ctx.reply('❌ لا يمكنك الزواج من نفسك! هذا محزن.');

    const user = database.getUser(ctx.sender);
    const targetUser = database.getUser(target);

    if (user.partner) return ctx.reply(`❌ أنت متزوج بالفعل من @${user.partner.split('@')[0]}!`, { mentions: [user.partner] });
    if (targetUser.partner) return ctx.reply(`❌ هذا الشخص متزوج بالفعل من @${targetUser.partner.split('@')[0]}!`, { mentions: [targetUser.partner] });

    pendingMarriages.set(target, ctx.sender);
    
    let proposeMsg = `💍 *عرض زواج رومانسي* 💍\n\n`;
    proposeMsg += `يا @${target.split('@')[0]}، يتقدم @${ctx.senderNumber} بطلب يدك للزواج الافتراضي!\n`;
    proposeMsg += `👉 للقبول وإتمام العقد، يرجى كتابة: *.قبول_زواج*`;

    const buttons = [
        { id: '.قبول_زواج', text: '💍 أقبل الزواج' }
    ];

    await ctx.replyWithButtons(proposeMsg, 'الحب ينير دروب المغامرين!', buttons);
}, {
    description: 'عرض الزواج على مستخدم آخر في المجموعة لتسجيله شريكاً',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});

registerCommand('قبول_زواج', async (ctx) => {
    const senderJid = ctx.sender;
    const proposer = pendingMarriages.get(senderJid);

    if (!proposer) return ctx.reply('❌ ليس لديك أي عروض زواج معلقة حالياً!');

    const user = database.getUser(senderJid);
    const proposerUser = database.getUser(proposer);

    if (user.partner || proposerUser.partner) {
        pendingMarriages.delete(senderJid);
        return ctx.reply('❌ أحد الطرفين ارتبط بالفعل بشريك آخر.');
    }

    database.updateUser(senderJid, { partner: proposer });
    database.updateUser(proposer, { partner: senderJid });
    pendingMarriages.delete(senderJid);

    await ctx.sock.sendMessage(ctx.from, {
        text: `🎉 مبارك للعروسين! 💍✨\n@${proposer.split('@')[0]} و @${senderJid.split('@')[0]} أصبحا الآن متزوجين رسمياً في البوت! 🤵‍♂️👰‍♀️\nنتمنى لكما حياة افتراضية سعيدة!`,
        mentions: [proposer, senderJid]
    }, { quoted: ctx.msg });
}, {
    description: 'قبول عرض الزواج المعلق وإتمام عقد النكاح',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});

registerCommand('طلاق', async (ctx) => {
    const user = database.getUser(ctx.sender);
    if (!user.partner) return ctx.reply('❌ أنت أعزب لست متزوجاً لتقوم بالطلاق!');

    const partnerJid = user.partner;
    database.updateUser(ctx.sender, { partner: null });
    database.updateUser(partnerJid, { partner: null });

    await ctx.sock.sendMessage(ctx.from, {
        text: `💔 تم الانفصال والطلاق رسميًا بين @${ctx.senderNumber} و @${partnerJid.split('@')[0]}.. نتمنى لكما مسارات أفضل في الحياة.`,
        mentions: [ctx.sender, partnerJid]
    }, { quoted: ctx.msg });
}, {
    description: 'الطلاق والانفصال عن شريكك الحالي',
    category: '🎮 ألعاب وتسلية'
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🦹 نظام السرقة (Steal)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
registerCommand('سرقة', async (ctx) => {
    let target = null;
    if (ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (ctx.msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = ctx.msg.message.extendedTextMessage.contextInfo.participant;
    }

    if (!target) return ctx.reply('❌ يرجى منشن الشخص المراد سرقته أو الرد على رسالته!');
    if (target === ctx.sender) return ctx.reply('😅 سرقة نفسك؟ يا لك من لص أحمق!');

    const thief = database.getUser(ctx.sender);
    const victim = database.getUser(target);

    if (victim.wallet < 100) {
        return ctx.reply('❌ الضحية فقيرة جداً ولا يملك حتى 100 ذهبة لسرقتها!');
    }

    // درع الحماية من السرقة
    if (victim.shield > 0) {
        const fine = Math.min(thief.wallet, randomInt(150, 300));
        database.updateUser(ctx.sender, { wallet: thief.wallet - fine });
        database.updateUser(target, {
            wallet: victim.wallet + fine,
            shield: victim.shield - 1
        });

        return ctx.reply(`🛡️ لقد حاول اللص @${ctx.senderNumber} سرقة @${target.split('@')[0]}، ولكن درع الحماية السحري للضحية تصدى له!\n💥 انكسر درع الضحية، وتم تغريم اللص *${fine}* ذهبة لصالح الضحية!`, {
            mentions: [ctx.sender, target]
        });
    }

    // 40% فرصة نجاح
    const success = Math.random() < 0.40;
    if (success) {
        const robPercent = randomInt(10, 25) / 100;
        const stolenAmount = Math.round(victim.wallet * robPercent);

        database.updateUser(ctx.sender, { wallet: thief.wallet + stolenAmount });
        database.updateUser(target, { wallet: victim.wallet - stolenAmount });

        await checkQuestProgress(ctx, 'steal');

        return ctx.reply(`🦹 *سرقة ناجحة!* لقد تسللت خلف @${target.split('@')[0]} وسرقت *${formatNumber(stolenAmount)}* ذهبة بنجاح! 💸`, {
            mentions: [target]
        });
    } else {
        // فشل ودفع غرامة
        const fine = Math.round(thief.wallet * 0.15);
        database.updateUser(ctx.sender, { wallet: thief.wallet - fine });
        database.updateUser(target, { wallet: victim.wallet + fine });

        return ctx.reply(`🚨 *أُمسك بك!* تعثرت ووقعت أثناء محاولتك الهرب بالذهب، الحراس غرموك *${formatNumber(fine)}* ذهبة وتم تسليمها لـ @${target.split('@')[0]}!`, {
            mentions: [target]
        });
    }
}, {
    description: 'محاولة سرقة عملات من محفظة مستخدم آخر (نجاح 40%)',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});

// 🎭 اختيار الفئة القتالية
registerCommand('فئة', async (ctx) => {
    const user = database.getUser(ctx.sender);
    const chosen = ctx.args[0]?.trim();

    const validClasses = {
        'سياف': { maxHealth: 100, attack: 15, defense: 5, desc: 'سياف شجاع بضربات متزنة وسرعة عالية ⚔️' },
        'فارس': { maxHealth: 150, attack: 10, defense: 15, desc: 'فارس مدرع بصحة عالية وقوة تحمل خارقة 🛡️' },
        'ساحر': { maxHealth: 80, attack: 25, defense: 3, desc: 'ساحر غامض بضربات سحرية خارقة ودفاع ضعيف 🔮' }
    };

    if (!chosen || !validClasses[chosen]) {
        let helpText = `🎭 *اختيار الفئة القتالية (RPG Classes)* 🎭\n\n`;
        helpText += `يرجى اختيار فئة قتالية للبدء في غارات الزعماء والمبارزات:\n\n`;
        helpText += `1️⃣ *سياف* ⚔️\n`;
        helpText += `   ❤️ الصحة القصوى: 100 | 🗡️ الهجوم: 15 | 🛡️ الدفاع: 5\n\n`;
        helpText += `2️⃣ *فارس* 🛡️\n`;
        helpText += `   ❤️ الصحة القصوى: 150 | 🗡️ الهجوم: 10 | 🛡️ الدفاع: 15\n\n`;
        helpText += `3️⃣ *ساحر* 🔮\n`;
        helpText += `   ❤️ الصحة القصوى: 80 | 🗡️ الهجوم: 25 | 🛡️ الدفاع: 3\n\n`;
        helpText += `👉 للتفعيل اكتب: *.فئة [سياف / فارس / ساحر]*\n`;
        helpText += `💡 ملاحظة: أول اختيار مجاني، وتغيير الفئة لاحقاً يكلف 10 جواهر 💎.`;
        return ctx.reply(helpText);
    }

    const hasClass = user.class && user.class !== 'بدون';
    if (hasClass) {
        const gemCost = 10;
        if ((user.gems || 0) < gemCost) {
            return ctx.reply(`❌ تغيير فئتك الحالية يكلف *${gemCost}* جواهر 💎! رصيدك الحالي: *${user.gems || 0}* جواهر.`);
        }
        database.updateUser(ctx.sender, {
            class: chosen,
            gems: user.gems - gemCost,
            maxHealth: validClasses[chosen].maxHealth,
            health: validClasses[chosen].maxHealth,
            attack: validClasses[chosen].attack,
            defense: validClasses[chosen].defense
        });
        return ctx.reply(`✅ تم تغيير فئتك القتالية بنجاح إلى: *[ ${chosen} ]*! 🎭\n💸 تم خصم *${gemCost}* جواهر من رصيدك.`);
    } else {
        database.updateUser(ctx.sender, {
            class: chosen,
            maxHealth: validClasses[chosen].maxHealth,
            health: validClasses[chosen].maxHealth,
            attack: validClasses[chosen].attack,
            defense: validClasses[chosen].defense
        });
        return ctx.reply(`🎉 مبارك! لقد بدأت مسيرتك القتالية واخترت فئة *[ ${chosen} ]*! 🎭\n❤️ تم تحديث إحصائياتك وصحتك للمستوى الأساسي للفئة.`);
    }
}, {
    description: 'اختيار فئة البطل RPG (سياف/فارس/ساحر) لتحديد أسلوب القتال والخصائص',
    category: '🎮 ألعاب وتسلية'
});

// 🔨 تطوير السلاح بالذهب والحديد
registerCommand('تطوير', async (ctx) => {
    const user = database.getUser(ctx.sender);
    const inventory = user.inventory || [];

    let activeWeapon = null;
    if (inventory.includes('سيف_الفرسان')) {
        activeWeapon = 'سيف الفرسان الملكي';
    } else if (inventory.includes('سيف_فولاذي')) {
        activeWeapon = 'سيف فولاذي';
    } else if (inventory.includes('سيف_برونزي')) {
        activeWeapon = 'سيف برونزي';
    }

    if (!activeWeapon) {
        return ctx.reply('❌ لا تمتلك أي سلاح قابل للتطوير في مخزنك حالياً! اذهب للمتجر لشراء سيف أولاً عبر: *.متجر*');
    }

    const currentLevel = user.weaponLevel || 0;
    const nextLevel = currentLevel + 1;

    const goldCost = nextLevel * 800;
    const ironCost = nextLevel * 3;
    const ironCount = inventory.filter(item => item === 'خام_حديد').length;

    if (user.wallet < goldCost) {
        return ctx.reply(`❌ ذهبك غير كافي للتطوير للمستوى +${nextLevel}!\n💰 التكلفة: *${formatNumber(goldCost)}* ذهبة | رصيدك: *${formatNumber(user.wallet)}* ذهبة.`);
    }

    if (ironCount < ironCost) {
        return ctx.reply(`❌ ليس لديك خامات حديد كافية للتطوير للمستوى +${nextLevel}!\n🧱 الحديد المطلوب: *${ironCost}* | لديك حالياً: *${ironCount}* خام حديد.\n💡 احصل على خامات الحديد من المناجم عبر أمر: *.تعدين*`);
    }

    const successRates = { 1: 0.90, 2: 0.80, 3: 0.70, 4: 0.60 };
    const successRate = successRates[nextLevel] || 0.45;

    let consumed = 0;
    const updatedInventory = [];
    for (const item of inventory) {
        if (item === 'خام_حديد' && consumed < ironCost) {
            consumed++;
        } else {
            updatedInventory.push(item);
        }
    }

    const roll = Math.random();
    if (roll < successRate) {
        const newAttack = user.attack + 5;
        database.updateUser(ctx.sender, {
            wallet: user.wallet - goldCost,
            weaponLevel: nextLevel,
            attack: newAttack,
            inventory: updatedInventory
        });

        let successMsg = `🔨 *عملية حدادة وتطوير ناجحة!* 🔨\n\n`;
        successMsg += `لقد قام الحداد بصقل سلاحك [ *${activeWeapon}* ] بنجاح!\n`;
        successMsg += `⚔️ مستوى السلاح الآن: *+${nextLevel}*\n`;
        successMsg += `🗡️ قوة الهجوم الحالية: *${newAttack}* (+5 ضرر إضافي)\n`;
        successMsg += `💸 تم خصم *${formatNumber(goldCost)}* ذهبة و *${ironCost}* خام حديد.`;
        
        await ctx.reply(successMsg);
    } else {
        database.updateUser(ctx.sender, {
            wallet: user.wallet - Math.round(goldCost * 0.5),
            inventory: updatedInventory
        });

        let failMsg = `💥 *انفجار في كور الحدادة!* 💥\n\n`;
        failMsg += `للأسف فشل تطوير سلاحك [ *${activeWeapon} +${currentLevel}* ] للمستوى +${nextLevel}.\n`;
        failMsg += `🧱 خسرت *${ironCost}* خام حديد، وتم تغريمك بنصف تكلفة الذهب (*${formatNumber(Math.round(goldCost * 0.5))}* ذهبة).\n`;
        failMsg += `💡 نسبة النجاح كانت: *${Math.round(successRate * 100)}%*، حظاً أوفر في المرة القادمة!`;
        
        await ctx.reply(failMsg);
    }
}, {
    description: 'ترقية وتطوير سيفك لزيادة قوة هجومك باستخدام الذهب وخام الحديد',
    category: '🎮 ألعاب وتسلية'
});

// 📋 لوحة المهام اليومية للأبطال
registerCommand('مهام', async (ctx) => {
    const user = database.getUser(ctx.sender);
    const now = Date.now();
    let quest = user.activeQuest;
    let needsNew = !quest || new Date(quest.lastAssigned).toDateString() !== new Date().toDateString();

    if (needsNew) {
        const randomQuest = QUEST_TYPES[Math.floor(Math.random() * QUEST_TYPES.length)];
        quest = {
            ...randomQuest,
            current: 0,
            completed: false,
            lastAssigned: now
        };
        database.updateUser(ctx.sender, { activeQuest: quest });
    }

    let msg = `📋 *لوحة المهام اليومية للأبطال* 📋\n\n`;
    msg += `👤 المغامر: @${ctx.senderNumber}\n`;
    msg += `⚔️ المهمة النشطة: *${quest.desc}*\n`;
    msg += `📊 التقدم الحالي: *[ ${quest.current} / ${quest.target} ]*\n`;
    msg += `🏆 الجوائز عند الإتمام: *${formatNumber(quest.rewardGold)}* ذهبة + *${quest.rewardGems}* جوهرة 💎\n`;
    msg += `─────────────────\n`;
    if (quest.completed) {
        msg += `✅ *حالة المهمة:* مكتملة! تم استلام الجوائز بنجاح. عد غداً لمهمة جديدة!`;
    } else {
        msg += `💡 *حالة المهمة:* قيد التنفيذ. اتبع الإرشادات لإتمامها!`;
    }

    await ctx.sock.sendMessage(ctx.from, { text: msg, mentions: [ctx.sender] }, { quoted: ctx.msg });
}, {
    description: 'عرض مهمتك اليومية النشطة والحصول على مهام جديدة',
    category: '🎮 ألعاب وتسلية'
});
