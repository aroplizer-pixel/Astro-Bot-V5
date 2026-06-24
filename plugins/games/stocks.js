import { registerCommand } from '../../lib/handler.js';
import { database } from '../../lib/db.js';
import { formatNumber, randomChoice } from '../../lib/utils.js';

// أسعار الأسهم والسلع الافتراضية
export const stockMarket = {
    btc: { name: 'Bitcoin (BTC) 🪙', price: 50000, lastChange: 0 },
    eth: { name: 'Ethereum (ETH) 🔷', price: 3000, lastChange: 0 },
    sol: { name: 'Solana (SOL) ☀️', price: 150, lastChange: 0 },
    gold: { name: 'الذهب (GOLD) 🟡', price: 2000, lastChange: 0 },
    nvda: { name: 'Nvidia (NVDA) 🟢', price: 120, lastChange: 0 },
    aapl: { name: 'Apple (AAPL) 🍏', price: 170, lastChange: 0 }
};

// أخبار البورصة الاقتصادية المحاكية
const marketNews = [
    "🟢 عاجل: أرباح قياسية لشركة NVIDIA تدفع سهمها NVDA لصعود قوي في التداولات!",
    "🔴 عاجل: تحذيرات من بنك دولي بخصوص مخاطر العملات المشفرة تهبط بـ Bitcoin و Ethereum!",
    "🟢 عاجل: إقبال متزايد على شراء الذهب GOLD كملاذ آمن في ظل التوترات الاقتصادية العالمية.",
    "🔴 عاجل: مخاوف تقنية تتسبب في خسائر طفيفة لشركات التكنولوجيا الكبرى AAPL.",
    "🟢 عاجل: ترقية شبكة Ethereum بنجاح ترفع توقعات المتداولين إلى السماء وترفع سعر السهم!",
    "🟢 عاجل: شراكة استراتيجية لـ Apple مع مطوري الذكاء الاصطناعي ترفع الطلب على سهمها.",
    "🟢 عاجل: شبكة Solana تسجل نشاطاً قياسياً للمستخدمين وصعود سهم SOL بنسبة كبيرة!"
];

// تتبع الخبر الحالي النشط
let currentNews = "📊 السوق مستقر حالياً مع تداولات هادئة بانتظار الافتتاح الأمريكي.";

// تحديث الأسعار والخبر تلقائياً كل 5 دقائق
setInterval(() => {
    for (const key of Object.keys(stockMarket)) {
        const changePercent = (Math.random() * 24 - 12) / 100; // من -12% إلى +12%
        const oldPrice = stockMarket[key].price;
        const newPrice = Math.max(1, Math.round(oldPrice * (1 + changePercent)));
        
        stockMarket[key].price = newPrice;
        stockMarket[key].lastChange = Math.round(changePercent * 100 * 10) / 10;
    }
    currentNews = randomChoice(marketNews);
}, 300000); // 5 دقائق

registerCommand('بورصة', async (ctx) => {
    const subCommand = ctx.args[0];

    // 1. عرض البورصة العامة
    if (!subCommand) {
        let board = `📈 *بورصة الأسهم والعملات الرقمية الملكية* 📊\n\n`;
        board += `📰 *شريط الأخبار الاقتصادي:*\n_${currentNews}_\n`;
        board += `━━━━━━━━━━━━━━━━━\n\n`;

        for (const [key, stock] of Object.entries(stockMarket)) {
            const changeSign = stock.lastChange >= 0 ? '📈 +' : '📉 ';
            board += `• *${stock.name}* [ رمز: \`${key.toUpperCase()}\` ]\n`;
            board += `  💰 السعر: *${formatNumber(stock.price)}* ذهبة | التغير: *${changeSign}${stock.lastChange}%*\n\n`;
        }
        
        board += `━━━━━━━━━━━━━━━━━\n`;
        board += `👉 للشراء: *.بورصة شراء [الرمز] [الكمية]*\n`;
        board += `👉 للبيع: *.بورصة بيع [الرمز] [الكمية]*\n`;
        board += `👉 للمحفظة: *.بورصة محفظتي*`;

        const buttons = [
            { id: '.بورصة محفظتي', text: '📊 محفظة أسهمي' },
            { id: '.بروفايل', text: '👤 بروفايلي' },
            { id: '.عمل', text: '💼 عمل لجمع الذهب' }
        ];

        return ctx.replyWithButtons(board, 'المضاربة في البورصة تحقق الثراء الفاحش أو الإفلاس التام!', buttons);
    }

    // 2. شراء الأسهم
    if (subCommand === 'شراء') {
        const symbol = ctx.args[1]?.toLowerCase();
        const quantity = parseInt(ctx.args[2]);

        if (!symbol || !stockMarket[symbol]) {
            return ctx.reply('❌ رمز السهم غير صحيح! الرموز المتوفرة: (btc, eth, sol, gold, nvda, aapl)');
        }
        if (isNaN(quantity) || quantity <= 0) {
            return ctx.reply('❌ يرجى إدخال كمية صحيحة أكبر من الصفر للشراء!\n👉 مثال: *.بورصة شراء btc 1*');
        }

        const user = database.getUser(ctx.sender);
        const cost = stockMarket[symbol].price * quantity;

        if (user.wallet < cost) {
            return ctx.reply(`❌ رصيدك لا يكفي! تكلفة الأسهم: *${formatNumber(cost)}* ذهبة، ورصيد محفظتك الحالي: *${formatNumber(user.wallet)}* ذهبة.`);
        }

        // قراءة وتحديث محفظة الأسهم الخاصة بالمستخدم
        const userStocks = typeof user.stocks === 'string' ? JSON.parse(user.stocks || '{}') : (user.stocks || {});
        userStocks[symbol] = (userStocks[symbol] || 0) + quantity;

        database.updateUser(ctx.sender, {
            wallet: user.wallet - cost,
            stocks: JSON.stringify(userStocks)
        });

        const buttons = [
            { id: '.بورصة محفظتي', text: '📊 محفظة أسهمي' },
            { id: '.بورصة', text: '📈 عرض البورصة' }
        ];

        return ctx.replyWithButtons(
            `✅ تم شراء *${quantity}* سهم من *${stockMarket[symbol].name}* بنجاح!\n` +
            `💰 التكلفة الإجمالية: *${formatNumber(cost)}* عملة ذهبية خصمت من محفظتك.`,
            'تم تحديث محفظة تداولك الشخصية.',
            buttons
        );
    }

    // 3. بيع الأسهم
    if (subCommand === 'بيع') {
        const symbol = ctx.args[1]?.toLowerCase();
        const quantity = parseInt(ctx.args[2]);

        if (!symbol || !stockMarket[symbol]) {
            return ctx.reply('❌ رمز السهم غير صحيح! الرموز المتوفرة: (btc, eth, sol, gold, nvda, aapl)');
        }
        if (isNaN(quantity) || quantity <= 0) {
            return ctx.reply('❌ يرجى إدخال كمية صحيحة أكبر من الصفر للبيع!\n👉 مثال: *.بورصة بيع btc 1*');
        }

        const user = database.getUser(ctx.sender);
        const userStocks = typeof user.stocks === 'string' ? JSON.parse(user.stocks || '{}') : (user.stocks || {});
        const owned = userStocks[symbol] || 0;

        if (owned < quantity) {
            return ctx.reply(`❌ ليس لديك أسهم كافية! تملك فقط *${owned}* سهم من هذا الرمز.`);
        }

        const revenue = stockMarket[symbol].price * quantity;
        userStocks[symbol] = owned - quantity;

        database.updateUser(ctx.sender, {
            wallet: user.wallet + revenue,
            stocks: JSON.stringify(userStocks)
        });

        const buttons = [
            { id: '.ايداع الكل', text: '🏦 إيداع الأرباح في البنك' },
            { id: '.بورصة', text: '📈 عرض البورصة' }
        ];

        return ctx.replyWithButtons(
            `✅ تم بيع *${quantity}* سهم من *${stockMarket[symbol].name}* بنجاح!\n` +
            `💰 الأرباح المكتسبة: *+${formatNumber(revenue)}* ذهبة تم تسليمها لمحفظتك.`,
            'تداول موفق في الأسواق العالمية!',
            buttons
        );
    }

    // 4. محفظة الأسهم الخاصة بالمستخدم
    if (subCommand === 'محفظتي' || subCommand === 'محفظه') {
        const user = database.getUser(ctx.sender);
        const userStocks = typeof user.stocks === 'string' ? JSON.parse(user.stocks || '{}') : (user.stocks || {});

        let walletText = `📊 *سجل استثمارات ومحفظة أسهم البطل @${ctx.senderNumber}* 📈\n\n`;
        let totalValue = 0;
        let hasStocks = false;

        for (const [symbol, qty] of Object.entries(userStocks)) {
            if (qty > 0) {
                hasStocks = true;
                const stockVal = stockMarket[symbol].price * qty;
                totalValue += stockVal;
                walletText += `• *${stockMarket[symbol].name}* [رمز: \`${symbol.toUpperCase()}\` ]:\n`;
                walletText += `  📈 الأسهم: *${qty}* سهم | القيمة السوقية الحالية: *${formatNumber(stockVal)}* ذهبة\n\n`;
            }
        }

        if (!hasStocks) {
            walletText += `📭 لا تملك أي أسهم أو عملات رقمية في محفظتك الاستثمارية حالياً!\n\n`;
        }

        walletText += `━━━━━━━━━━━━━━━━━\n`;
        walletText += `💰 *القيمة السوقية الإجمالية للمحفظة:* *${formatNumber(totalValue)}* عملة ذهبية.`;

        const buttons = [
            { id: '.بورصة', text: '📈 عرض البورصة' },
            { id: '.بروفايل', text: '👤 بروفايلي' }
        ];

        await ctx.sock.sendMessage(ctx.from, {
            text: walletText,
            buttons: buttons.map(b => ({ buttonId: b.id, buttonText: { displayText: b.text }, type: 1 })),
            headerType: 1,
            mentions: [ctx.sender]
        }, { quoted: ctx.msg }).catch(async () => {
            let fallback = walletText + `\n━━━━━━━━━━━━━━━━━\n`;
            buttons.forEach(b => { fallback += `🔹 [ ${b.text} ] ➔ اكتب *${b.id}*\n`; });
            await ctx.sock.sendMessage(ctx.from, { text: fallback, mentions: [ctx.sender] }, { quoted: ctx.msg });
        });
    }
}, {
    description: 'تداول الأسهم وشراء العملات الرقمية والمضاربة في البورصة الملكية',
    category: '🎮 ألعاب وتسلية'
});
