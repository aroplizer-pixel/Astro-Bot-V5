import { registerCommand } from '../../lib/handler.js';
import { database } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { activeGames } from '../../lib/games.js';
import { randomChoice } from '../../lib/utils.js';

// قاعدة أسئلة ثقافية متنوعة
const triviaQuestions = [
    { q: 'ما هي عاصمة مصر؟', options: ['الإسكندرية', 'القاهرة', 'الأقصر', 'أسوان'], answer: 1 },
    { q: 'كم عدد أركان الإسلام؟', options: ['3', '4', '5', '6'], answer: 2 },
    { q: 'ما هو أكبر كوكب في المجموعة الشمسية؟', options: ['المشتري', 'زحل', 'الأرض', 'المريخ'], answer: 0 },
    { q: 'من كتب رواية "البؤساء"؟', options: ['تولستوي', 'هيغو', ' Dickens', 'دوستويفسكي'], answer: 1 },
    { q: 'ما هي أطول نهر في العالم؟', options: ['الأمازون', 'النيل', 'المسيسيبي', 'اليانغتسي'], answer: 1 },
    { q: 'كم دولة في جامعة الدول العربية؟', options: ['20', '21', '22', '23'], answer: 2 },
    { q: 'ما هو العنصر الأكثر وفرة في الأرض؟', options: ['الأكسجين', 'السيليكون', 'الحديد', 'الألمنيوم'], answer: 1 },
    { q: 'في أي عام فُتحت مكة؟', options: ['6 هجري', '8 هجري', '10 هجري', '4 هجري'], answer: 1 },
    { q: 'ما هي أصغر قارة في العالم؟', options: ['أوروبا', 'أنتاركتيكا', 'أستراليا', 'أمريكا الجنوبية'], answer: 2 },
    { q: 'من مخترع الهاتف؟', options: ['تسلا', 'أديسون', 'بل', 'مورس'], answer: 2 },
    { q: 'ما هي العملة الرسمية لليابان؟', options: ['الوون', 'اليوان', 'الين', 'الدولار'], answer: 2 },
    { q: 'كم ساعة في اليوم؟', options: ['12', '24', '48', '36'], answer: 1 },
    { q: 'ما هو الغاز الأكثر وفرة في الغلاف الجوي؟', options: ['الأكسجين', 'النيتروجين', 'الهيدروجين', 'ثاني أكسيد الكربون'], answer: 1 },
    { q: 'من هو أول رسول في الإسلام؟', options: ['نوح', 'آدم', 'إبراهيم', 'محمد'], answer: 1 },
    { q: 'ما هو أكبر محيط في العالم؟', options: ['الأطلسي', 'الهادئ', 'الهندي', 'المتجمد'], answer: 1 },
];

registerCommand('ثقافة', async (ctx) => {
    if (!ctx.isGroup) {
        return ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    }

    if (activeGames.has(ctx.from)) {
        return ctx.reply('⚠️ يوجد سؤال نشط بالفعل! أجب عن السؤال الحالي أولاً.');
    }

    const question = randomChoice(triviaQuestions);
    const prize = 80; // مكافأة الإجابة الصحيحة

    activeGames.set(ctx.from, {
        type: 'trivia',
        answer: question.options[question.answer],
        answerIndex: String(question.answer + 1), // "1", "2", "3", or "4"
        prize
    });

    let text = `🧠 *سؤال ثقافي!* 🧠\n\n`;
    text += `📝 ${question.q}\n\n`;
    question.options.forEach((opt, i) => {
        text += `${i + 1}. ${opt}\n`;
    });
    text += `\n💰 *الجوائز:* ${prize} عملة للإجابة الصحيحة\n`;
    text += `\n💡 أرسل رقم الإجابة الصحيحة (1-${question.options.length})`;

    await ctx.reply(text);

    // حذف السؤال بعد 30 ثانية إن لم يُجاب
    setTimeout(() => {
        if (activeGames.get(ctx.from)?.type === 'trivia') {
            activeGames.delete(ctx.from);
        }
    }, 30000);
}, {
    description: 'سؤال ثقافي عشوائي مع مكافأة مالية',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});

// 🪨 حجر ورقة مقص
registerCommand('حجر', async (ctx) => {
    if (!ctx.isGroup) return ctx.reply('❌ متاح فقط في المجموعات!');

    const choices = ['حجر', 'ورقة', 'مقص'];
    const emojis = { 'حجر': '🪨', 'ورقة': '📄', 'مقص': '✂️' };
    const botChoice = randomChoice(choices);
    const userChoice = 'حجر';

    const result = getResult(userChoice, botChoice);
    await ctx.reply(
        `🎮 *حجر ورقة مقص!*\n\n` +
        `🤖 البوت: ${emojis[botChoice]} ${botChoice}\n` +
        `👤 أنت: ${emojis[userChoice]} ${userChoice}\n\n` +
        `🟢 *${result}*`
    );
}, {
    description: 'لعب حجر ورقة مقص مع البوت',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});

registerCommand('ورقة', async (ctx) => {
    if (!ctx.isGroup) return ctx.reply('❌ متاح فقط في المجموعات!');
    const choices = ['حجر', 'ورقة', 'مقص'];
    const emojis = { 'حجر': '🪨', 'ورقة': '📄', 'مقص': '✂️' };
    const botChoice = randomChoice(choices);
    const result = getResult('ورقة', botChoice);
    await ctx.reply(
        `🎮 *حجر ورقة مقص!*\n\n🤖 البوت: ${emojis[botChoice]} ${botChoice}\n👤 أنت: 📄 ورقة\n\n🟢 *${result}*`
    );
}, {
    description: 'لعب ورقة',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});

registerCommand('مقص', async (ctx) => {
    if (!ctx.isGroup) return ctx.reply('❌ متاح فقط في المجموعات!');
    const choices = ['حجر', 'ورقة', 'مقص'];
    const emojis = { 'حجر': '🪨', 'ورقة': '📄', 'مقص': '✂️' };
    const botChoice = randomChoice(choices);
    const result = getResult('مقص', botChoice);
    await ctx.reply(
        `🎮 *حجر ورقة مقص!*\n\n🤖 البوت: ${emojis[botChoice]} ${botChoice}\n👤 أنت: ✂️ مقص\n\n🟢 *${result}*`
    );
}, {
    description: 'لعب مقص',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});

function getResult(user, bot) {
    if (user === bot) return 'تعادل! 🤝';
    if ((user === 'حجر' && bot === 'مقص') || (user === 'ورقة' && bot === 'حجر') || (user === 'مقص' && bot === 'ورقة')) {
        return 'فزت! 🎉';
    }
    return 'خسرت! 😅';
}
