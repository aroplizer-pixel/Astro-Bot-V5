import { registerCommand } from '../../lib/handler.js';
import { formatDuration } from '../../lib/utils.js';

const startTime = Date.now();

registerCommand('بنج', async (ctx) => {
    const start = Date.now();
    await ctx.reply('⏳ فحص سرعة الاستجابة...');
    const latency = Date.now() - start;
    const uptime = Date.now() - startTime;

    await ctx.sock.sendMessage(ctx.from, {
        text: `⚡ *سرعة الاستجابة:* ${latency} ملي ثانية\n⏱️ *وقت التشغيل:* ${formatDuration(Math.floor(uptime / 1000))}\n🧠 *الرام:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
    }, { quoted: ctx.msg });
}, {
    description: 'فحص سرعة استجابة البوت ووقت التشغيل',
    category: '⚙️ عام'
});

registerCommand('ping', async (ctx) => {
    const start = Date.now();
    await ctx.reply('⏳ Ping...');
    const latency = Date.now() - start;
    const uptime = Date.now() - startTime;

    await ctx.sock.sendMessage(ctx.from, {
        text: `🏓 *Pong!* ${latency}ms | Uptime: ${formatDuration(Math.floor(uptime / 1000))} | RAM: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    }, { quoted: ctx.msg });
}, {
    description: 'Ping command (English)',
    category: '⚙️ عام'
});
