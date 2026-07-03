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
