# Setup Guide — Your Part of the Project

This guide covers everything that only *you* can do: creating accounts and
copy-pasting keys. **Nothing needs to be installed on your computer.**
The app will run on the internet (via Vercel) and you'll test it in your
normal browser — including on your phone.

It will grow as we build each step. Right now it covers **Step 1: Login**.

You'll create three free accounts, in this order:

1. **Supabase** — the database + login service
2. **Google Cloud** — powers "Sign in with Google" and Sheets access
3. **Vercel** — puts the app on the internet

Have a place ready to paste things temporarily (a private note or doc):
you'll be carrying a few keys from one dashboard to another.

---

## Part A — Create your Supabase project

1. Go to <https://supabase.com> and click **Start your project**.
   Sign up with GitHub (easiest — you already have that account).
2. Click **New project**.
   - Organization: accept the default.
   - Name: `gift-card-logger`
   - Database password: click **Generate a password** and save it somewhere
     safe (you rarely need it, but don't lose it).
   - Region: pick the one closest to you.
3. Wait ~2 minutes while the project spins up.

### A1. Copy your keys

1. In the left sidebar: **Project Settings** (gear icon) → **API Keys** /
   **Data API**.
2. Copy these three values into your notes:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / publishable key** — the public one
   - **service_role / secret key** — the secret one (click "Reveal")

### A2. Create the database table

1. In the left sidebar: **SQL Editor** → **New query**.
2. Open this file on GitHub and copy ALL of it:
   [`supabase/schema.sql`](https://github.com/Samuel-SeBe/GiftCardLogger/blob/claude/gift-card-logger-onboarding-1cxbg5/supabase/schema.sql)
   (click the copy icon at the top right of the file view).
3. Paste it into the SQL editor and click **Run**.
4. You should see "Success. No rows returned."

---

## Part B — Create your Google Cloud project

This is what lets users click "Sign in with Google" and lets the app write
to Google Sheets. It's free.

### B1. Create the project

1. Go to <https://console.cloud.google.com> and sign in with your Google
   account.
2. Click the project dropdown (top left) → **New Project**.
   - Name: `Gift Card Logger`
3. Click **Create**, then make sure it's the selected project (top left).

### B2. Enable the APIs the app needs

1. In the search bar at the top, type **Google Sheets API** → open it →
   click **Enable**.
2. Same again for **Google Drive API** → **Enable**.

### B3. Set up the consent screen

This is the "Gift Card Logger wants access to..." screen users see.

1. Search for **OAuth consent screen** (or go to APIs & Services →
   OAuth consent screen). If Google shows "Google Auth Platform", click
   **Get started**.
2. Fill in:
   - App name: `Gift Card Logger`
   - User support email: your email
   - Audience: **External**
   - Contact email: your email
3. Agree and click **Create** / **Continue** through the remaining screens.
4. Find **Audience** (or "Test users") in the left menu and click
   **Add users** — add your own email address. While the app is in
   "Testing" mode, only listed test users can sign in. That's perfect for
   now.

### B4. Create the OAuth credentials

1. Go to **APIs & Services** → **Credentials** (or "Clients" under Google
   Auth Platform).
2. Click **Create credentials** → **OAuth client ID**.
   - Application type: **Web application**
   - Name: `Gift Card Logger Web`
3. Under **Authorized redirect URIs**, click **Add URI** and paste your
   Supabase callback URL. It is:

   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```

   Replace `YOUR-PROJECT-REF` with the part of your Supabase Project URL
   before `.supabase.co`. (You can also copy this exact URL from Supabase:
   Authentication → Sign In / Providers → Google → "Callback URL".)
4. Click **Create**. A box appears with your **Client ID** and
   **Client Secret** — copy both into your notes.

---

## Part C — Connect Google to Supabase

1. In Supabase: **Authentication** → **Sign In / Providers** → **Google**.
2. Toggle **Enable Sign in with Google** on.
3. Paste in the **Client ID** and **Client Secret** from step B4.
4. Click **Save**.

---

## Part D — Put the app on the internet with Vercel

1. Go to <https://vercel.com> and click **Sign Up**.
   Choose **Continue with GitHub** — this is important, it's how Vercel
   sees your code.
2. Choose the **Hobby** (free) plan if asked.
3. On your dashboard, click **Add New…** → **Project**.
4. You'll see a list of your GitHub repositories. Click **Import** next to
   **GiftCardLogger**. (If it's not listed, click "Adjust GitHub App
   Permissions" and grant Vercel access to the repo.)
5. Before clicking Deploy, open the **Environment Variables** section and
   add these three, using the values from step A1:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service_role / secret key |

6. Click **Deploy** and wait a minute or two.
7. When it finishes, Vercel shows your app's address — something like
   `https://gift-card-logger-xxxx.vercel.app`. Copy it into your notes.
   This is your app's home on the internet from now on.

---

## Part E — Tell Supabase your app's address

Supabase only redirects sign-ins back to addresses it trusts.

1. In Supabase: **Authentication** → **URL Configuration**.
2. Set **Site URL** to your Vercel address from step D7, e.g.
   `https://gift-card-logger-xxxx.vercel.app`

   ⚠️ This must be the **vercel.app** address (your app), NOT the
   supabase.co address (your database).
3. Under **Redirect URLs**, click **Add URL** and add your Vercel address
   followed by `/**` (two asterisks), e.g.

   ```
   https://gift-card-logger-xxxx.vercel.app/**
   ```

   This tells Supabase it's allowed to send signed-in users back to any
   page of your app.
4. Click **Save**.

---

## Part F — Test it! 🎉

1. Open your Vercel address in a browser (your phone works great).
2. You should see the **Gift Card Logger** login screen.
3. Tap **Sign in with Google** → pick your Google account → approve access
   (including "See, edit, create and delete only the specific Google Drive
   files you use with this app" — that's the spreadsheet permission).
4. You should land on the home screen with **Take Photo** and
   **Choose Existing Photo** buttons.
5. Bonus check: in Supabase → **Table Editor** → `users`, there's now one
   row with your email.

If anything fails, tell Claude exactly what you saw (screenshots help!).

---

# Step 2 — Let the app create your spreadsheet

The app creates a "Gift Card Inventory" spreadsheet in your Google Drive on
first visit. For that, it needs two more values in Vercel and one switch
flipped in Google Cloud.

## Step 2, Part A — Add your Google credentials to Vercel

These are the **Client ID** and **Client Secret** you created in Part B4.
If you didn't keep them: Google Cloud console → **APIs & Services** →
**Credentials** → click your `Gift Card Logger Web` client — the Client ID
is shown, and the secret is under "Client secrets".

1. Vercel → your project → **Settings** → **Environment Variables**.
2. Add these two:

   | Name | Value |
   |---|---|
   | `GOOGLE_CLIENT_ID` | ends in `.apps.googleusercontent.com` |
   | `GOOGLE_CLIENT_SECRET` | starts with `GOCSPX-` |

3. Redeploy so they take effect: **Deployments** tab → **⋯** on the newest
   deployment → **Redeploy**.

## Step 2, Part B — Publish your Google app

Right now your Google app is in "Testing" mode. Google expires testing-mode
permissions after 7 days, which would force you to re-approve access every
week. Publishing fixes that, and because this app only uses a low-risk
permission, there's no review process.

1. Google Cloud console → **APIs & Services** → **OAuth consent screen**
   (or "Audience" under Google Auth Platform).
2. Find **Publishing status: Testing** and click **Publish app** → confirm.

## Step 2, Part C — Test it

1. Open your app (https://gift-card-logger.vercel.app) and make sure you're
   signed in. The first load may take a couple of extra seconds — that's
   the app creating your spreadsheet.
2. Open <https://sheets.google.com> — you should see a new spreadsheet named
   **Gift Card Inventory** with the columns: Date, Vendor, Card Number,
   PIN, Value.
3. It only ever creates one — refreshing the app won't make more.

---

# Step 3 — Give the app its AI key

The AI that reads gift cards out of photos is Google Gemini.

1. Go to <https://aistudio.google.com/app/apikey> and sign in with the same
   Google account.
2. Click **Create API key** (pick the `Gift Card Logger` project if asked).
3. Copy the key — it starts with `AQ.` (older keys start with `AIza`; both
   work).
4. Vercel → your project → **Settings** → **Environment Variables** → add:

   | Name | Value |
   |---|---|
   | `GEMINI_API_KEY` | your key |

5. Redeploy: **Deployments** tab → **⋯** on the newest deployment →
   **Redeploy**.

## Step 3 — Test it

1. Open the app on your phone.
2. Tap **Take Photo** and photograph a gift card (or a few at once).
3. The app shows "Processing Image..." for a few seconds, then a review
   screen with the vendor, card number, PIN, and value it read — every
   field editable.
4. "Approve & Save" is wired up in Step 4.

---

# Step 5 — Trial limit, free passes, and Stripe billing

Every account gets 3 free image uploads. After that, the app shows a
subscription screen. Two kinds of people skip the limit entirely:

- **Paying subscribers** (managed automatically by Stripe)
- **Free passes** — friends, family, beta testers, and you

## Step 5, Part A — Give yourself (and testers) a free pass

In Supabase → **SQL Editor** → New query:

```sql
update public.users set subscription_status = 'complimentary' where email = 'someone@example.com';
```

Run it once per person (they need to have signed in at least once so their
row exists). Or use **Table Editor** → `users` → edit the person's
`subscription_status` cell to `complimentary`.

To revoke a pass, set it back to `trial`.

## Step 5, Part B — Create your Stripe product

1. Sign up at <https://stripe.com>. You can skip most of the business
   questionnaire for now — stay in **Test mode** (toggle in the top right
   of the dashboard) until launch.
2. Go to **Product catalog** → **Add product**:
   - Name: `Gift Card Logger`
   - Add a price: **Recurring**, **Monthly**, and the amount you choose.
3. Save, then click the price you just made and copy its **Price ID** —
   starts with `price_`.

## Step 5, Part C — Keys into Vercel

1. Stripe dashboard → **Developers** → **API keys** → copy the
   **Secret key** (starts `sk_test_` in test mode).
2. Vercel → Settings → Environment Variables → add:

   | Name | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | `sk_test_...` |
   | `STRIPE_PRICE_ID` | `price_...` |

## Step 5, Part D — The webhook (how Stripe tells the app "they paid")

1. Stripe dashboard → **Developers** → **Webhooks** → **Add endpoint**
   (choose "Add destination"/"Webhook endpoint" if asked).
2. Endpoint URL:

   ```
   https://gift-card-logger.vercel.app/api/stripe/webhook
   ```

3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Create it, then copy the endpoint's **Signing secret** (starts
   `whsec_`).
5. Vercel → Environment Variables → add:

   | Name | Value |
   |---|---|
   | `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

6. Redeploy: **Deployments** → **⋯** → **Redeploy**.

## Step 5, Part E — Test the whole money loop

1. Sign in with a **different Google account** than your own (it gets its
   own 3 free uploads).
2. Upload 3 photos, then try a 4th → the subscription screen should appear
   showing your price.
3. Tap **Subscribe** → Stripe's checkout opens. Pay with Stripe's test
   card: number `4242 4242 4242 4242`, any future expiry date, any CVC,
   any name/postcode.
4. You land back on the app — uploads now work without limit.
5. In Stripe → **Customers**, you'll see the test subscription.

No real money moves in test mode. Before launch we swap in live keys
(that's Step 6).

---

# Refer a friend — one-time database update

The referral program ("friend subscribes → you get a free month") needs
three new columns. In Supabase → **SQL Editor** → New query, run:

```sql
alter table public.users add column referral_code text unique;
alter table public.users add column referred_by uuid references public.users(id);
alter table public.users add column referral_rewarded_at timestamptz;
```

That's the whole setup — rewards are granted automatically as Stripe
credit when a referred friend's first payment succeeds.

---

# Step 6a — Point giftcardsnapper.com at the app

All dashboard configuration — no code changes.

## 1. Add the domain in Vercel

1. Vercel → your project → **Settings** → **Domains**.
2. Add `giftcardsnapper.com`. When asked, also accept `www.giftcardsnapper.com`
   (choose the non-www as primary; Vercel redirects the www one).
3. Vercel now shows the exact DNS records to create — typically an **A**
   record for the bare domain and a **CNAME** for `www`.

## 2. Create those DNS records at your registrar

Wherever you bought giftcardsnapper.com (GoDaddy, Namecheap, etc.), open
its DNS settings and add exactly the records Vercel showed. Then wait —
usually minutes, occasionally a few hours. Vercel's Domains page shows a
green check when it's live, and HTTPS is automatic.

## 3. Tell Supabase about the new address

Supabase → **Authentication** → **URL Configuration**:

- **Site URL**: `https://giftcardsnapper.com`
- **Redirect URLs** — add both (keep the old vercel.app entry too):
  ```
  https://giftcardsnapper.com/**
  https://www.giftcardsnapper.com/**
  ```

## 4. Optional tidy-ups

- Stripe → Developers → Webhooks: the existing endpoint on
  gift-card-logger.vercel.app keeps working, but you can edit its URL to
  `https://giftcardsnapper.com/api/stripe/webhook` for neatness.
- Google Cloud → OAuth consent screen / Branding: set the app homepage to
  `https://giftcardsnapper.com` and add `giftcardsnapper.com` under
  authorized domains if prompted.

## 5. Test

Open `https://giftcardsnapper.com` in a private window, sign in with
Google, upload a photo. Everything should behave identically to the
vercel.app address (which keeps working as a backup).

---

# Step 6 — Launch checklist (not yet — collected as we go)

- [ ] **Fix the name shown on the Google sign-in page.** Two parts:
  - The app name itself: Google Cloud console → OAuth consent screen /
    Branding → "App name" — change it to `Gift Card Snapper`. While
    you're there, consider renaming the Stripe product too (Product
    catalog → edit) so receipts say Gift Card Snapper.
  - The "to continue to abc123.supabase.co" line: Google shows the domain
    that handles the sign-in, which is currently the Supabase project
    address. Making it say your own domain requires a custom domain
    (bought at launch) attached to Supabase (paid add-on, ~$10/mo) — a
    polish item to decide on at launch.
- [ ] Switch Stripe from test mode to live mode (live keys into Vercel).
- [ ] Turn on billing for the Gemini API key.
- [x] Custom domain: giftcardsnapper.com — see Step 6a above.
- [ ] Remove the temporary "Sign out" link on the home screen (or keep it).

---

## Appendix — Running on your own computer (optional, not required)

Developers sometimes run the app locally for faster feedback. You don't
need this, but if you ever want it: install Node.js LTS from
<https://nodejs.org> and GitHub Desktop from <https://desktop.github.com>,
clone the repo, copy `.env.example` to `.env.local` and fill in the
Supabase values, then run `npm install` and `npm run dev` in the project
folder and open <http://localhost:3000>. You'd also need to add
`http://localhost:3000` to Supabase's Authentication → URL Configuration →
Redirect URLs.
