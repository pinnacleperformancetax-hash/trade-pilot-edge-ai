create extension if not exists "pgcrypto";

create table if not exists public.user_access (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  pro_active boolean not null default false,
  ai_active boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_access enable row level security;

drop policy if exists "authenticated users can read own access" on public.user_access;

create policy "authenticated users can read own access"
on public.user_access
for select
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'));
