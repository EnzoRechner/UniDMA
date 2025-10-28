-- Supabase schema for Expo Notifications
-- Run these via Supabase SQL editor or migrations

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  expo_push_token text not null,
  is_active boolean not null default true,
  platform text check (platform in ('ios','android','web')),
  updated_at timestamptz not null default now()
);

create unique index if not exists device_tokens_user_token_unique
  on public.device_tokens (user_id, expo_push_token);

create table if not exists public.notification_preferences (
  user_id text primary key,
  push_enabled boolean not null default true,
  booking_confirmed_enabled boolean not null default true,
  booking_rejected_enabled boolean not null default true,
  new_booking_staff_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id text primary key,
  role int not null,
  branch int,
  branch_name text
);

create table if not exists public.notification_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  booking_id text,
  notification_type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
