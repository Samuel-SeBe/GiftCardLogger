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

-- Row-level security: browsers may only READ their own row.
-- All writes happen server-side with the service role key, so nobody can
-- reset their own trial count or subscription status from a browser.
alter table public.users enable row level security;

create policy "Users can view own row"
  on public.users for select
  using (auth.uid() = id);
