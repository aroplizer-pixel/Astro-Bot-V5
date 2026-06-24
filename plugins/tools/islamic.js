import { registerCommand } from '../../lib/handler.js';
import { randomChoice } from '../../lib/utils.js';
import axios from 'axios';

// قائمة الأذكار النبوية والقرآنية الموثقة
const DHIKR_LIST = [
    "🌸 سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
    "✨ لا حَوْلَ وَلا قُوَّةَ إِلا بِاللَّهِ العلي العظيم",
    "📖 { أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ }",
    "🕌 اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
    "🌟 أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لا إِلَهَ إِلا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
    "🌱 لا إِلَهَ إِلا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
    "💎 لا إِلَهَ إِلا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    "📖 { وَقُل رَّبِّ زِدْنِي عِلْمًا }",
    "🤲 اللهم إنا نسألك علماً نافعاً، ورزقاً طيباً، وعملاً متقبلاً",
    "🌸 سُبْحَانَ اللَّهِ ، وَالْحَمْدُ لِلَّهِ ، وَلا إِلَهَ إِلا اللَّهُ ، وَاللَّهُ أَكْبَر",
    "🕊️ سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ",
    "🕌 يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ"
];

// قائمة الأدعية المأثورة
const DUA_LIST = [
    "🤲 رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    "🤲 رَبَّنَا لا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ",
    "🤲 اللهم إنك عفو كريم تحب العفو فاعفُ عني",
    "🤲 يا مقلب القلوب ثبت قلبي على دينك",
    "🤲 رَبِّ اجْعَلْنِي مُقِيمَ الصَّلاةِ وَمِنْ ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ",
    "🤲 اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ"
];

registerCommand('اذكار', async (ctx) => {
    const dhikr = randomChoice(DHIKR_LIST);
    let dhikrText = `✨ *الذكر اليومي المستحب* ✨\n\n`;
    dhikrText += `${dhikr}\n\n`;
    dhikrText += `🌸 شارك الذكر لتعم الأجور والمغفرة.`;

    const buttons = [
        { id: '.اذكار', text: '✨ ذكر آخر' },
        { id: '.دعاء', text: '🤲 دعاء مأثور' }
    ];

    await ctx.replyWithButtons(dhikrText, 'أذكار وأدعية البوت اليومية', buttons);
}, {
    description: 'عرض ذكر إسلامي عشوائي',
    category: '🕌 إسلاميات'
});

registerCommand('دعاء', async (ctx) => {
    const dua = randomChoice(DUA_LIST);
    let duaText = `🤲 *دعاء مأثور مستجاب بإذن الله* 🤲\n\n`;
    duaText += `${dua}\n\n`;
    duaText += `🌿 لا تنسَ نفسك ولوالديك والمسلمين من دعائك الصادق.`;

    const buttons = [
        { id: '.دعاء', text: '🤲 دعاء آخر' },
        { id: '.اذكار', text: '✨ ذكر مأثور' }
    ];

    await ctx.replyWithButtons(duaText, 'أذكار وأدعية البوت اليومية', buttons);
}, {
    description: 'عرض دعاء مأثور عشوائي',
    category: '🕌 إسلاميات'
});

// Cairo Prayer Times Command
const prayerTimesCmd = async (ctx) => {
    await ctx.reply('⏳ جاري جلب مواقيت الصلاة لمدينة القاهرة...');
    try {
        const url = 'http://www.emam-api.web.id/home/sections/Tools/api/prayer-times?q=1';
        const response = await axios.get(url, { timeout: 10000 });
        if (response.data && response.data.status && response.data.data) {
            const d = response.data.data;
            let msg = `🕌 *مواقيت الصلاة لمدينة ${d.city}* (${d.country})\n`;
            msg += `📅 التاريخ: ${d.date.gregorian.date} م / ${d.date.hijri.year} هـ\n\n`;
            msg += `🌅 الفجر: ${d.prayerTimes.fajr}\n`;
            msg += `☀️ الشروق: ${d.prayerTimes.sunrise}\n`;
            msg += `🕌 الظهر: ${d.prayerTimes.dhuhr}\n`;
            msg += `🕌 العصر: ${d.prayerTimes.asr}\n`;
            msg += `🌆 المغرب: ${d.prayerTimes.maghrib}\n`;
            msg += `🌃 العشاء: ${d.prayerTimes.isha}\n\n`;
            msg += `🌸 { أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَىٰ غَسَقِ اللَّيْلِ }`;
            await ctx.reply(msg);
        } else {
            throw new Error('فشل قراءة البيانات من خادم المواقيت');
        }
    } catch (e) {
        await ctx.reply('❌ حدث خطأ أثناء جلب مواقيت الصلاة حالياً.');
    }
};

registerCommand('مواقيت', prayerTimesCmd, {
    description: 'عرض مواقيت الصلاة لمدينة القاهرة اليوم',
    category: '🕌 إسلاميات'
});

registerCommand('prayer', prayerTimesCmd, {
    description: 'Display prayer times for Cairo today',
    category: '🕌 إسلاميات'
});

// Quran Reciters List Command
const recitersCmd = async (ctx) => {
    await ctx.reply('⏳ جاري جلب قائمة قراء القرآن الكريم المتوفرين...');
    try {
        const url = 'http://www.emam-api.web.id/home/sections/Ai/api/api/V1/tts/islamic-voices';
        const response = await axios.get(url, { timeout: 10000 });
        if (response.data && Array.isArray(response.data)) {
            let msg = `📖 *قائمة قراء القرآن الكريم المتوفرين لتحويل النصوص:* \n\n`;
            response.data.forEach((r, idx) => {
                msg += `${idx + 1}. *${r.name}* (كود: \`${r.value}\`)\n`;
            });
            await ctx.reply(msg);
        } else {
            throw new Error('استجابة غير صالحة');
        }
    } catch (e) {
        await ctx.reply('❌ حدث خطأ أثناء جلب قائمة القراء.');
    }
};

registerCommand('قراء', recitersCmd, {
    description: 'عرض قائمة قراء القرآن الكريم لتحويل الصوت',
    category: '🕌 إسلاميات'
});

registerCommand('reciters', recitersCmd, {
    description: 'Get list of Quran reciters available',
    category: '🕌 إسلاميات'
});
