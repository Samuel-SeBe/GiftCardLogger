# Setup Guide — Your Part of the Project

This guide covers everything that only *you* can do: creating accounts and
copy-pasting keys. No coding required. Follow it top to bottom.

It will grow as we build each step. Right now it covers **Step 1: Login**.

---

## Part A — Get the app running on your computer

You only do this once.

### A1. Install Node.js

Node.js is the engine that runs the app on your computer.

1. Go to <https://nodejs.org>
2. Download the **LTS** version (the button on the left).
3. Run the installer, accepting all defaults.

### A2. Install GitHub Desktop

The easiest way to get the code onto your computer.

1. Go to <https://desktop.github.com> and install it.
2. Sign in with your GitHub account.
3. Choose **Clone a repository** and pick `Samuel-SeBe/GiftCardLogger`.
4. Remember the folder it clones into (it shows you the path).
5. **Important:** at the top of GitHub Desktop, click **Current Branch** and
   switch to `claude/gift-card-logger-onboarding-1cxbg5`. That's the branch
   where the app lives right now.

### A3. Open a terminal in the project folder

- **Windows:** open the folder in File Explorer, click the address bar, type
  `cmd`, press Enter.
- **Mac:** open Terminal (Cmd+Space, type "Terminal"), type `cd `, drag the
  project folder into the window, press Enter.

Then run this command (it downloads the app's building blocks, takes a minute):

```
npm install
```

---

## Part B — Create your Supabase project

Supabase is the free database + login service.

1. Go to <https://supabase.com> and click **Start your project**.
   Sign up with GitHub (easiest).
2. Click **New project**.
   - Organization: accept the default.
   - Name: `gift-card-logger`
   - Database password: click **Generate a password** and save it somewhere
     safe (you rarely need it, but don't lose it).
   - Region: pick the one closest to you.
3. Wait ~2 minutes while the project spins up.

### B1. Copy your keys

1. In the left sidebar: **Project Settings** (gear icon) → **API Keys** /
   **Data API**.
2. You need three values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / publishable key** — the public one
   - **service_role / secret key** — the secret one (click "Reveal")

### B2. Create the database table

1. In the left sidebar: **SQL Editor** → **New query**.
2. Open the file `supabase/schema.sql` in this project, copy ALL of it,
   paste it into the editor, and click **Run**.
3. You should see "Success. No rows returned."

---

## Part C — Create your Google Cloud project

This is what lets users click "Sign in with Google" and lets the app write
to Google Sheets. It's free.

### C1. Create the project

1. Go to <https://console.cloud.google.com> and sign in with your Google
   account.
2. Click the project dropdown (top left) → **New Project**.
   - Name: `Gift Card Logger`
3. Click **Create**, then make sure it's the selected project (top left).

### C2. Enable the APIs the app needs

1. In the search bar at the top, type **Google Sheets API** → open it →
   click **Enable**.
2. Same again for **Google Drive API** → **Enable**.

### C3. Set up the consent screen

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

### C4. Create the OAuth credentials

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
   **Client Secret**. Keep this open for Part D.

---

## Part D — Connect Google to Supabase

1. In Supabase: **Authentication** → **Sign In / Providers** → **Google**.
2. Toggle **Enable Sign in with Google** on.
3. Paste in the **Client ID** and **Client Secret** from step C4.
4. Click **Save**.
5. Still in Authentication, open **URL Configuration**:
   - Site URL: `http://localhost:3000`

---

## Part E — Give the app your keys and run it

1. In the project folder, find the file `.env.example`. Make a copy of it
   named exactly `.env.local` (note the leading dot).
2. Open `.env.local` in any text editor (Notepad / TextEdit) and fill in the
   three Supabase values from step B1:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
   ```

3. In your terminal (Part A3), run:

   ```
   npm run dev
   ```

4. Open <http://localhost:3000> in your browser.

### What success looks like

1. You see the **Gift Card Logger** login screen.
2. Click **Sign in with Google** → Google asks you to pick your account and
   approve access (including "See, edit, create and delete only the specific
   Google Drive files you use with this app" — that's the spreadsheet
   permission).
3. You land on the home screen with **Take Photo** and
   **Choose Existing Photo** buttons.
4. Bonus check: in Supabase → **Table Editor** → `users`, there's now one
   row with your email.

If anything fails, tell Claude exactly what you saw (screenshots help!).
