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
