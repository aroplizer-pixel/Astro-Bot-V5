import { registerCommand } from '../../lib/handler.js';
import { activeGames } from '../../lib/games.js';

registerCommand('رياضيات', async (ctx) => {
    if (activeGames.has(ctx.from)) {
        return ctx.reply('⚠️ هناك لعبة نشطة بالفعل في هذه المجموعة! قم بحلها أولاً.');
    }

    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];

    let num1, num2, answer;

    if (operator === '*') {
        num1 = Math.floor(Math.random() * 12) + 2; // 2 - 13
        num2 = Math.floor(Math.random() * 10) + 2; // 2 - 11
    } else {
        num1 = Math.floor(Math.random() * 100) + 10;
        num2 = Math.floor(Math.random() * 100) + 10;
    }

    // حساب الحل الصحيح
    if (operator === '+') answer = num1 + num2;
    if (operator === '-') answer = num1 - num2;
    if (operator === '*') answer = num1 * num2;

    const prize = Math.floor(Math.random() * 150) + 50; // جائزة بين 50 و 200 عملة

    activeGames.set(ctx.from, {
        type: 'math',
        answer,
        prize
    });

    const question = `📐 *لعبة الرياضيات* 📐\n\nأوجد ناتج العملية التالية:\n👉 *${num1} ${operator} ${num2}*\n\n🎁 *الجائزة:* ${prize} عملة ذهبية!\n⏱️ أسرع شخص يكتب الإجابة الصحيحة هو الفائز.`;
    await ctx.reply(question);
}, {
    description: 'بدء لعبة رياضيات تفاعلية في المجموعة وكسب عملات',
    category: '🎮 ألعاب وتسلية',
    groupOnly: true
});
