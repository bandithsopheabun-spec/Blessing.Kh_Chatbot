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
//  No database, no payments. A small admin panel lets an admin
//  set a welcome banner image + welcome video from inside Telegram.
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

const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const isAdmin = (id) => ADMIN_IDS.includes(String(id));

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

// ---- 3. MEDIA CONFIG (welcome banner + video) ------------------
// Admins set these live from inside Telegram; the file IDs persist to
// media_config.json. NOTE: Render's disk is ephemeral — the JSON file is
// wiped on every redeploy. For a permanent banner/video, also copy the
// printed File ID into the BANNER_PHOTO_ID / WELCOME_VIDEO_ID env vars.
const MEDIA_FILE = path.join(__dirname, 'media_config.json');
let mediaConfig = {
  bannerPhotoId: process.env.BANNER_PHOTO_ID || null,
  welcomeVideoId: process.env.WELCOME_VIDEO_ID || null,
};
function loadMediaConfig() {
  try {
    const saved = JSON.parse(fs.readFileSync(MEDIA_FILE, 'utf8'));
    if (saved.bannerPhotoId) mediaConfig.bannerPhotoId = saved.bannerPhotoId;
    if (saved.welcomeVideoId) mediaConfig.welcomeVideoId = saved.welcomeVideoId;
  } catch (e) {
    /* no saved file yet — env-var defaults stand */
  }
}
function saveMediaConfig() {
  try {
    fs.writeFileSync(MEDIA_FILE, JSON.stringify(mediaConfig, null, 2));
  } catch (e) {
    console.error('⚠️ save media_config.json បរាជ័យ:', e.message);
  }
}
loadMediaConfig();

// ---- 4. HELPERS ----------------------------------------------
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

// Welcome screen: banner photo (if set) → else welcome video (if set) →
// else plain text. Then the services list.
async function sendWelcome(ctx) {
  // Message 1: welcome (banner photo / video / text) carrying the bottom menu
  try {
    if (mediaConfig.bannerPhotoId) {
      await ctx.replyWithPhoto(mediaConfig.bannerPhotoId, {
        caption: T.welcome,
        parse_mode: 'HTML',
        ...mainKeyboard,
      });
      if (mediaConfig.welcomeVideoId) {
        await ctx.replyWithVideo(mediaConfig.welcomeVideoId, { supports_streaming: true });
      }
    } else if (mediaConfig.welcomeVideoId) {
      await ctx.replyWithVideo(mediaConfig.welcomeVideoId, {
        caption: T.welcome,
        parse_mode: 'HTML',
        supports_streaming: true,
        ...mainKeyboard,
      });
    } else {
      await ctx.replyWithHTML(T.welcome, { disable_web_page_preview: true, ...mainKeyboard });
    }
  } catch (e) {
    console.error('⚠️ send welcome media បរាជ័យ:', e.message);
    await ctx.replyWithHTML(T.welcome, { disable_web_page_preview: true, ...mainKeyboard });
  }
  // Message 2: the services list
  await ctx.replyWithHTML(T.servicesIntro, servicesInlineKeyboard());
}

// ---- 5. TEXTS (Khmer) ---------------------------------------
const T = {
  welcome:
    '🌟 <b>សូមស្វាគមន៍មកកាន់ Blessing.Kh</b> 🌟\n\n' +
    'សេវាកម្មបង្កើន <b>Likes • Views • Followers</b> លើ <b>TikTok</b> — ' +
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
    '✅ <b>តម្លៃចាប់ពី $2 ឡើងទៅ</b> — មានកញ្ចប់តូចធំ សម្រាប់គ្រប់ថវិកា\n' +
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

// ---- 6. PUBLIC HANDLERS ------------------------------------
bot.start((ctx) => sendWelcome(ctx));

bot.help((ctx) => ctx.replyWithHTML(T.how, orderButton));

bot.command('myid', (ctx) =>
  ctx.reply(`🆔 Telegram ID របស់អ្នក ៖ ${ctx.from.id}\n(ដាក់លេខនេះក្នុង ADMIN_IDS ដើម្បីក្លាយជា Admin)`)
);

bot.hears(['🎁 សេវាកម្មទាំងអស់', '/services'], (ctx) =>
  ctx.replyWithHTML(T.servicesIntro, servicesInlineKeyboard())
);

bot.hears(['💎 ហេតុអ្វីជ្រើសរើសយើង'], (ctx) => ctx.replyWithHTML(T.why, orderButton));

bot.hears(['📖 របៀបបញ្ជាទិញ', '/how'], (ctx) => ctx.replyWithHTML(T.how, orderButton));

bot.command('menu', (ctx) => ctx.reply('👇 មេនុយ ៖', mainKeyboard));

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

// ---- 7. ADMIN PANEL (banner + video) ----------------------
const adminState = {}; // { [userId]: 'AWAITING_BANNER' | 'AWAITING_VIDEO' }

function adminPanelText() {
  return (
    '🔐 <b>Admin — Welcome Media</b>\n\n' +
    `🖼️ Banner ៖ ${mediaConfig.bannerPhotoId ? '✅ បានកំណត់' : '— មិនទាន់មាន'}\n` +
    `🎬 Video ៖ ${mediaConfig.welcomeVideoId ? '✅ បានកំណត់' : '— មិនទាន់មាន'}\n\n` +
    '<i>Banner បង្ហាញនៅពេលអតិថិជនចុច /start ។ បើមានទាំង Banner និង Video ' +
    'នោះ Banner បង្ហាញមុន បន្ទាប់មក Video ។</i>'
  );
}

function adminPanelKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🖼️ កំណត់ Banner', 'adm:banner'), Markup.button.callback('🎬 កំណត់ Video', 'adm:video')],
    [
      Markup.button.callback('🗑️ លុប Banner', 'adm:del_banner'),
      Markup.button.callback('🗑️ លុប Video', 'adm:del_video'),
    ],
    [Markup.button.callback('👁️ មើលសាកល្បង (Preview)', 'adm:preview')],
    [Markup.button.callback('✖️ បិទ', 'adm:close')],
  ]);
}

bot.command('admin', (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply('⛔ អ្នកមិនមែនជា Admin ទេ។ ប្រើ /myid ដើម្បីមើល ID របស់អ្នក។');
  }
  delete adminState[ctx.from.id];
  return ctx.replyWithHTML(adminPanelText(), adminPanelKeyboard());
});

bot.action(/^adm:(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('⛔ Admin only', { show_alert: true });
  const action = ctx.match[1];
  await ctx.answerCbQuery();

  if (action === 'banner') {
    adminState[ctx.from.id] = 'AWAITING_BANNER';
    return ctx.replyWithHTML('🖼️ សូម <b>ផ្ញើរូបភាព</b> (photo) ដែលចង់ប្រើជា Banner ។\n\nផ្ញើ /cancel ដើម្បីបោះបង់។');
  }
  if (action === 'video') {
    adminState[ctx.from.id] = 'AWAITING_VIDEO';
    return ctx.replyWithHTML('🎬 សូម <b>ផ្ញើវីដេអូ</b> (video) ដែលចង់ប្រើ ។\n\nផ្ញើ /cancel ដើម្បីបោះបង់។');
  }
  if (action === 'del_banner') {
    mediaConfig.bannerPhotoId = null;
    saveMediaConfig();
    return ctx.editMessageText(adminPanelText(), { parse_mode: 'HTML', ...adminPanelKeyboard() });
  }
  if (action === 'del_video') {
    mediaConfig.welcomeVideoId = null;
    saveMediaConfig();
    return ctx.editMessageText(adminPanelText(), { parse_mode: 'HTML', ...adminPanelKeyboard() });
  }
  if (action === 'preview') {
    return sendWelcome(ctx);
  }
  if (action === 'close') {
    delete adminState[ctx.from.id];
    return ctx.editMessageText('✅ បិទ Admin panel ។');
  }
});

bot.command('cancel', (ctx) => {
  if (adminState[ctx.from.id]) {
    delete adminState[ctx.from.id];
    return ctx.reply('❌ បានបោះបង់។');
  }
});

// Admin uploads the banner photo / welcome video
bot.on('photo', async (ctx) => {
  if (!isAdmin(ctx.from.id) || adminState[ctx.from.id] !== 'AWAITING_BANNER') return;
  const photos = ctx.message.photo;
  const fileId = photos[photos.length - 1].file_id; // highest resolution
  mediaConfig.bannerPhotoId = fileId;
  saveMediaConfig();
  delete adminState[ctx.from.id];
  await ctx.replyWithHTML(
    '✅ <b>Banner ត្រូវបានកំណត់!</b>\n\n' +
      `<code>${fileId}</code>\n\n` +
      '💡 <i>ដើម្បីកុំឲ្យបាត់ពេល redeploy — ចម្លង File ID ខាងលើ ដាក់ក្នុង Render env var ' +
      '<code>BANNER_PHOTO_ID</code> ។</i>'
  );
  return ctx.replyWithHTML(adminPanelText(), adminPanelKeyboard());
});

bot.on('video', async (ctx) => {
  if (!isAdmin(ctx.from.id) || adminState[ctx.from.id] !== 'AWAITING_VIDEO') return;
  const fileId = ctx.message.video.file_id;
  mediaConfig.welcomeVideoId = fileId;
  saveMediaConfig();
  delete adminState[ctx.from.id];
  await ctx.replyWithHTML(
    '✅ <b>Video ត្រូវបានកំណត់!</b>\n\n' +
      `<code>${fileId}</code>\n\n` +
      '💡 <i>ដើម្បីកុំឲ្យបាត់ពេល redeploy — ចម្លង File ID ខាងលើ ដាក់ក្នុង Render env var ' +
      '<code>WELCOME_VIDEO_ID</code> ។</i>'
  );
  return ctx.replyWithHTML(adminPanelText(), adminPanelKeyboard());
});

// ---- 8. FALLBACK ------------------------------------------
bot.on('text', (ctx) => ctx.replyWithHTML(T.fallback, mainKeyboard));

bot.catch((err, ctx) => console.error(`⚠️ Bot error (${ctx?.updateType}):`, err));

// ---- 9. LAUNCH + HTTP HEALTH SERVER -----------------------
// Register the blue "Menu" command button next to the input field
async function setupBotMenu() {
  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: '🏠 ចាប់ផ្តើម' },
    ]);
    await bot.telegram.setChatMenuButton({ menuButton: { type: 'commands' } });
    console.log('✅ Bot command menu registered');
  } catch (e) {
    console.error('⚠️ setupBotMenu បរាជ័យ:', e.message);
  }
}

function launchBot(attempt = 1) {
  // NOTE: In Telegraf v4 bot.launch()'s promise resolves only when the bot
  // STOPS, so success is logged from the onLaunch callback instead. The
  // promise's .catch() still fires on a start-up error (e.g. a transient
  // 409 Conflict) — retry indefinitely with a capped backoff so the bot
  // self-heals rather than dying after N attempts.
  bot
    .launch({ dropPendingUpdates: true }, () => {
      console.log(`🤖 @${bot.botInfo?.username || 'blessing_kh_chatbot'} កំពុង polling → funnel ទៅ @${MAIN_BOT_USERNAME}`);
      setupBotMenu();
    })
    .catch((err) => {
      const wait = Math.min(60000, 5000 * attempt);
      console.error(`❌ Launch បរាជ័យ (លើកទី ${attempt}): ${err.message} — ព្យាយាមម្តងទៀតក្នុង ${wait / 1000}s`);
      setTimeout(() => launchBot(attempt + 1), wait);
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
