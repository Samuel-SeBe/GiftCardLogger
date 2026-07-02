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

## Appendix — Running on your own computer (optional, not required)

Developers sometimes run the app locally for faster feedback. You don't
need this, but if you ever want it: install Node.js LTS from
<https://nodejs.org> and GitHub Desktop from <https://desktop.github.com>,
clone the repo, copy `.env.example` to `.env.local` and fill in the
Supabase values, then run `npm install` and `npm run dev` in the project
folder and open <http://localhost:3000>. You'd also need to add
`http://localhost:3000` to Supabase's Authentication → URL Configuration →
Redirect URLs.
