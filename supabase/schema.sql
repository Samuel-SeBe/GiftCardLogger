-- Gift Card Logger database schema.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  spreadsheet_id text,
  google_refresh_token text,
  trial_uploads_used integer not null default 0,
  stripe_customer_id text,
  subscription_status text not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row-level security with NO policies: browsers can neither read nor
-- write this table at all. Every access goes through the app's server
-- code (service role key), so nobody can reset their own trial count,
-- change their subscription status, or read stored tokens from a browser.
alter table public.users enable row level security;

-- Referral program (added after launch of the base schema; existing
-- databases get these via: Step "Refer a friend" in SETUP.md)
-- referral_code: the user's shareable code (giftcardsnapper.com/?ref=CODE)
-- referred_by: who referred this user, captured at first sign-in
-- referral_rewarded_at: set once this user's first payment has granted
--   their referrer a free month, so it can never grant twice
alter table public.users add column referral_code text unique;
alter table public.users add column referred_by uuid references public.users(id);
alter table public.users add column referral_rewarded_at timestamptz;
