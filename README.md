# Blessing.Kh Chatbot (@blessing_kh_chatbot)

Bot ផ្សព្វផ្សាយ (marketing / catalog) ជាភាសាខ្មែរ។ តួនាទី ៖ ណែនាំសេវាកម្ម SMM
(TikTok / Telegram / Facebook — Likes, Views, Followers) រួច **បញ្ជូនអតិថិជនទៅ Bot មេ
[@BlessingKhV1_Bot](https://t.me/BlessingKhV1_Bot)** ដើម្បីដាក់ប្រាក់ និងបញ្ជាទិញ។

គ្មាន database • គ្មាន payment • គ្មាន admin panel — គ្រាន់តែបង្ហាញ menu និង deep-link។

## ការដំឡើង

```bash
npm install
cp .env.example .env      # រួចបំពេញ BOT_TOKEN
npm start
```

## Environment variables

| Key | ន័យ |
|---|---|
| `BOT_TOKEN` | Token របស់ @blessing_kh_chatbot ពី @BotFather |
| `MAIN_BOT_USERNAME` | Username Bot មេ (គ្មាន @) — `BlessingKhV1_Bot` |
| `ORDER_START_PARAM` | ref ដែលភ្ជាប់ជា `?start=` ពេលបើក Bot មេ (default `catalog`) |
| `SUPPORT_LINK` / `CHANNEL_LINK` | Link បង្ហាញក្នុង menu |
| `PORT` | Port health-check (Render កំណត់ស្វ័យប្រវត្តិ) |
| `ADMIN_IDS` | Telegram user ID (បំបែកដោយ `,`) ដែលអាចប្រើ `/admin` |
| `BANNER_PHOTO_ID` / `WELCOME_VIDEO_ID` | File ID Banner/Video ថេរ (កុំឲ្យបាត់ពេល redeploy) |

## Admin panel

Admin (ក្នុង `ADMIN_IDS`) ផ្ញើ `/admin` ទៅ bot → panel មាន៖

- 🖼️ **កំណត់ Banner** — ផ្ញើរូបភាព → បង្ហាញនៅ `/start`
- 🎬 **កំណត់ Video** — ផ្ញើវីដេអូ → បង្ហាញនៅ `/start` (បន្ទាប់ពី Banner បើមានទាំងពីរ)
- 🗑️ លុប Banner / Video
- 👁️ Preview

ផ្សេងទៀត៖ `/myid` បង្ហាញ Telegram ID របស់អ្នក។

> ⚠️ Render លុប `media_config.json` ពេល redeploy។ Bot បោះ File ID ចេញឲ្យ —
> ចម្លងវាដាក់ក្នុង env var `BANNER_PHOTO_ID` / `WELCOME_VIDEO_ID` ដើម្បីឲ្យថេរ។

## កែ content

កែ text និងកញ្ចប់សេវាកម្មក្នុង [`products.json`](products.json) — bot អាន file នេះឡើងវិញពេល restart។
Text ផ្សេងទៀត (welcome / why / how) នៅក្នុង object `T` ក្នុង [`index.js`](index.js)។

## Deploy (Render)

`render.yaml` រួចរាល់។ បង្កើត Web Service ថ្មី ភ្ជាប់ repo នេះ រួចដាក់ `BOT_TOKEN` ក្នុង Environment។

## ទំនាក់ទំនងទៅ Bot មេ

Bot មេ **មិនចាំបាច់កែ code**។ ប៊ូតុង "🛒 បញ្ជាទិញ" ទាំងអស់បើក
`https://t.me/BlessingKhV1_Bot?start=catalog_<service>` ។ Bot មេ មិនអាន​ payload ក៏ដំណើរការធម្មតា។
បើពេលក្រោយចង់ track ថាអតិថិជនមកពី catalog អាចបន្ថែម handler `bot.start` ក្នុង Bot មេ
ដើម្បីអាន `ctx.startPayload`។
