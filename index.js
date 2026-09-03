require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================
//  Blessing.Kh — Marketing / Catalog Bot   (@blessing_kh_chatbot)
// ------------------------------------------------------------
//  Purpose: introduce the SMM service packages in Khmer, then
//  funnel the customer into the MAIN ordering bot
//  (@BlessingKhV1_Bot) via a t.me deep link.
//  No database, no payments, no admin panel — display only.
// ============================================================

// ---- 1. CONFIG --------------------------------------------------
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN មិនទាន់កំណត់ក្នុង .env — សូមចម្លង .env.example ទៅ .env ជាមុនសិន។');
  process.exit(1);
}

const MAIN_BOT_USERNAME = (process.env.MAIN_BOT_USERNAME || 'BlessingKhV1_Bot').replace(/^@/, '');
const ORDER_START_PARAM = process.env.ORDER_START_PARAM || 'catalog';
const SUPPORT_LINK = process.env.SUPPORT_LINK || 'https://t.me/Blessing_Kh_Supports';
const CHANNEL_LINK = process.env.CHANNEL_LINK || 'https://t.me/Blessing_Kh_Public/3';
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(BOT_TOKEN);

// ---- 2. CATALOG CONTENT (editable via products.json) -----------
let catalog = { categories: [] };
function loadCatalog() {
  try {
    catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));
    if (!Array.isArray(catalog.categories)) catalog.categories = [];
  } catch (e) {
    console.error('⚠️ អាន products.json មិនបាន:', e.message);
    catalog = { categories: [] };
  }
}
loadCatalog();

// ---- 3. HELPERS ----------------------------------------------
function orderUrl(ref) {
  const param = ref ? `${ORDER_START_PARAM}_${ref}` : ORDER_START_PARAM;
  return `https://t.me/${MAIN_BOT_USERNAME}?start=${encodeURIComponent(param)}`;
}

const mainKeyboard = Markup.keyboard([
  ['🎁 សេវាកម្មទាំងអស់'],
  ['💎 ហេតុអ្វីជ្រើសរើសយើង', '📖 របៀបបញ្ជាទិញ'],
  ['🛒 បញ្ជាទិញឥឡូវនេះ'],
  ['💬 ជំនួយ Admin', '📢 Channel'],
]).resize();

function servicesInlineKeyboard() {
  const rows = catalog.categories.map((c) => [
    Markup.button.callback(`${c.emoji} ${c.title}`, `cat:${c.id}`),
  ]);
  rows.push([Markup.button.url('🛒 បញ្ជាទិញឥឡូវនេះ', orderUrl())]);
  return Markup.inlineKeyboard(rows);
}

function renderCategory(c) {
  let s = `<b>${c.emoji} ${c.title}</b>\n\n${c.description}\n`;
  if (Array.isArray(c.bullets) && c.bullets.length) {
    s += '\n' + c.bullets.map((b) => `✅ ${b}`).join('\n') + '\n';
  }
  if (c.priceHint) s += `\n💰 <b>${c.priceHint}</b>`;
  s += `\n\n🛒 <i>ចុចប៊ូតុងខាងក្រោមដើម្បីបញ្ជាទិញក្នុង Bot មេ @${MAIN_BOT_USERNAME}</i>`;
  return s;
}

// ---- 4. TEXTS (Khmer) ---------------------------------------
const T = {
  welcome:
    '🌟 <b>សូមស្វាគមន៍មកកាន់ Blessing.Kh</b> 🌟\n\n' +
    'សេវាកម្មបង្កើន <b>Likes • Views • Followers</b> លើ <b>TikTok</b> (និង Telegram / Facebook) — ' +
    'លឿន ទាន់ចិត្ត តម្លៃសមរម្យ។\n\n' +
    'សាកសមសម្រាប់ 🛍️ អ្នកលក់អនឡាញ • 🎬 អ្នកបង្កើត content • 📄 ម្ចាស់ page។\n\n' +
    '👇 ជ្រើសរើសមេនុយខាងក្រោមដើម្បីចាប់ផ្តើម។',

  servicesIntro:
    '🎁 <b>សេវាកម្មរបស់ Blessing.Kh</b>\n\n' +
    'សូមជ្រើសរើសសេវាកម្មដែលអ្នកចាប់អារម្មណ៍ ដើម្បីមើលព័ត៌មានលម្អិត ៖',

  why:
    '💎 <b>ហេតុអ្វីអតិថិជនជ្រើសរើស Blessing.Kh?</b>\n\n' +
    '✅ <b>ចាប់ផ្តើមលឿន</b> — ភាគច្រើនក្នុងរយៈពេល ៥ នាទី ដល់ ១ ម៉ោង\n' +
    '✅ <b>គុណភាពពិត</b> — គណនីសកម្ម មិនធ្លាក់ចុះ (drop) ងាយៗ\n' +
    '✅ <b>តម្លៃចាប់ពី $1.99</b> — មានកញ្ចប់តូចធំ សម្រាប់គ្រប់ថវិកា\n' +
    '✅ <b>ទូទាត់ងាយ</b> — Bakong KHQR / ABA / ACLEDA / Wing\n' +
    '✅ <b>Wallet ក្នុង Bot</b> — ដាក់ប្រាក់ម្តង បញ្ជាទិញបានច្រើនដង\n' +
    '✅ <b>ជំនួយ Admin ខ្មែរ</b> — រៀងរាល់ថ្ងៃ ៧ព្រឹក–១០យប់\n\n' +
    '🛒 ចុច <b>"បញ្ជាទិញឥឡូវនេះ"</b> ដើម្បីចាប់ផ្តើមក្នុង Bot មេ។',

  how:
    '📖 <b>របៀបបញ្ជាទិញ (៤ ជំហាន)</b>\n\n' +
    `1️⃣ ចុច <b>"🛒 បញ្ជាទិញឥឡូវនេះ"</b> — វានឹងបើក Bot មេ <b>@${MAIN_BOT_USERNAME}</b>\n` +
    '2️⃣ ចុច <b>Start</b> រួចដាក់ប្រាក់ចូល Wallet តាម Bakong / ABA / ACLEDA / Wing\n' +
    '3️⃣ ជ្រើសរើសសេវាកម្ម (Likes / Views / Followers) និងកញ្ចប់ដែលចង់បាន\n' +
    '4️⃣ ផ្ញើ link វីដេអូ ឬ profile របស់អ្នក — រួចរង់ចាំលទ្ធផល ✅\n\n' +
    '💬 ជាប់គាំងកន្លែងណា? ទាក់ទង Admin បានគ្រប់ពេល។',

  cta:
    '🛒 <b>បញ្ជាទិញឥឡូវនេះ</b>\n\n' +
    `ចុចប៊ូតុងខាងក្រោម — វានឹងបើក Bot មេ <b>@${MAIN_BOT_USERNAME}</b> ` +
    'ដែលអ្នកអាចដាក់ប្រាក់ និងបញ្ជាទិញបានផ្ទាល់។\n\n' +
    '💡 ចុច <b>Start</b> ក្នុង Bot មេ បើវាជាលើកដំបូង។',

  support: '💬 <b>ជំនួយ Admin</b>\n\nក្រុមការងារឆ្លើយតបរៀងរាល់ថ្ងៃ ៧ព្រឹក–១០យប់។ ចុចប៊ូតុងខាងក្រោម ៖',
  channel: '📢 <b>Channel ផ្លូវការ Blessing.Kh</b>\n\nតាមដាន promotion និងព័ត៌មានថ្មីៗ ៖',
  fallback:
    '👇 សូមប្រើមេនុយខាងក្រោម ឬចុច <b>🛒 បញ្ជាទិញឥឡូវនេះ</b> ដើម្បីទៅ Bot មេ @' + MAIN_BOT_USERNAME + '។',
};

const orderButton = Markup.inlineKeyboard([[Markup.button.url('🛒 បញ្ជាទិញឥឡូវនេះ', orderUrl())]]);

// ---- 5. HANDLERS --------------------------------------------
bot.start(async (ctx) => {
  await ctx.replyWithHTML(T.welcome, mainKeyboard);
  await ctx.replyWithHTML(T.servicesIntro, servicesInlineKeyboard());
});

bot.help((ctx) => ctx.replyWithHTML(T.how, orderButton));

bot.hears(['🎁 សេវាកម្មទាំងអស់', '/services'], (ctx) =>
  ctx.replyWithHTML(T.servicesIntro, servicesInlineKeyboard())
);

bot.hears(['💎 ហេតុអ្វីជ្រើសរើសយើង'], (ctx) => ctx.replyWithHTML(T.why, orderButton));

bot.hears(['📖 របៀបបញ្ជាទិញ'], (ctx) => ctx.replyWithHTML(T.how, orderButton));

bot.hears(['🛒 បញ្ជាទិញឥឡូវនេះ', '/order'], (ctx) =>
  ctx.replyWithHTML(T.cta, {
    disable_web_page_preview: true,
    ...Markup.inlineKeyboard([[Markup.button.url(`🛒 បើក Bot មេ @${MAIN_BOT_USERNAME}`, orderUrl())]]),
  })
);

bot.hears(['💬 ជំនួយ Admin'], (ctx) =>
  ctx.replyWithHTML(T.support, Markup.inlineKeyboard([[Markup.button.url('💬 ទាក់ទង Admin', SUPPORT_LINK)]]))
);

bot.hears(['📢 Channel'], (ctx) =>
  ctx.replyWithHTML(T.channel, Markup.inlineKeyboard([[Markup.button.url('📢 បើក Channel', CHANNEL_LINK)]]))
);

// Service detail
bot.action(/^cat:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const c = catalog.categories.find((x) => x.id === ctx.match[1]);
  if (!c) return;
  const kb = Markup.inlineKeyboard([
    [Markup.button.url(`🛒 បញ្ជាទិញ ${c.emoji}`, orderUrl(c.id))],
    [Markup.button.callback('⬅️ ត្រឡប់ក្រោយ', 'cats')],
  ]);
  try {
    await ctx.editMessageText(renderCategory(c), { parse_mode: 'HTML', disable_web_page_preview: true, ...kb });
  } catch (e) {
    await ctx.replyWithHTML(renderCategory(c), { disable_web_page_preview: true, ...kb });
  }
});

bot.action('cats', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText(T.servicesIntro, { parse_mode: 'HTML', ...servicesInlineKeyboard() });
  } catch (e) {
    await ctx.replyWithHTML(T.servicesIntro, servicesInlineKeyboard());
  }
});

// Anything else → nudge back to the menu / main bot
bot.on('message', (ctx) => ctx.replyWithHTML(T.fallback, mainKeyboard));

bot.catch((err, ctx) => console.error(`⚠️ Bot error (${ctx?.updateType}):`, err));

// ---- 6. LAUNCH + HTTP HEALTH SERVER ------------------------
function launchBot(attempt = 1) {
  bot
    .launch({ dropPendingUpdates: true })
    .then(() => console.log(`🤖 @${bot.botInfo?.username || 'blessing_kh_chatbot'} កំពុងដំណើរការ → funnel ទៅ @${MAIN_BOT_USERNAME}`))
    .catch((err) => {
      console.error(`❌ Launch បរាជ័យ (ព្យាយាមលើកទី ${attempt}):`, err.message);
      if (attempt < 5) setTimeout(() => launchBot(attempt + 1), 5000 * attempt);
    });
}
launchBot();

http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Blessing.Kh marketing bot — OK');
  })
  .listen(PORT, () => console.log(`🌐 Health server on :${PORT}`));

// Keep the free Render instance awake
const selfUrl = process.env.RENDER_EXTERNAL_URL;
if (selfUrl && typeof fetch === 'function') {
  setInterval(() => {
    fetch(selfUrl).catch(() => {});
  }, 5 * 60 * 1000);
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
