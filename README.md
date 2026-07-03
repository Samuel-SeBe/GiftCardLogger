# Gift Card Snapper

Mobile-first app for professional gift card resellers: photograph gift
cards, verify the extracted details, and save them as rows in Google Sheets.

Live at <https://giftcardsnapper.com> (repository name predates the brand).

- **Product spec:** see [SPEC.md](./SPEC.md)
- **Account & environment setup (start here):** see [SETUP.md](./SETUP.md)

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in your keys (see SETUP.md)
npm run dev
```

Open <http://localhost:3000>.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth)
· Google Sheets/Drive APIs · Google Gemini (OCR) · Stripe (billing) · Vercel
(hosting)
