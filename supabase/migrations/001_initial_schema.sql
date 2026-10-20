-- ============================================================
-- JobBuddy Phase 2: Initial Schema + RLS
-- ============================================================

-- profiles
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  email        text,
  phone        text,
  location     text,
  github_url   text,
  linkedin_url text,
  summary      text,
  onboarding_done boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- resumes
create table if not exists public.resumes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_type    text not null check (file_type in ('pdf','docx')),
  parse_status text not null default 'pending' check (parse_status in ('pending','parsing','done','failed')),
  created_at   timestamptz not null default now()
);

-- subscriptions
create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references auth.users(id) on delete cascade,
  plan                    text not null default 'free' check (plan in ('free','pro','unlimited')),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  status                  text not null default 'active',
  period_end              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- daily_apply_usage
create table if not exists public.daily_apply_usage (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date    date not null default current_date,
  count   integer not null default 0,
  unique (user_id, date)
);

-- ── Trigger: auto-create profile + free subscription on signup ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── RLS ──
alter table public.profiles          enable row level security;
alter table public.resumes           enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.daily_apply_usage enable row level security;

-- profiles
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- resumes
create policy "resumes_select" on public.resumes for select using (auth.uid() = user_id);
create policy "resumes_insert" on public.resumes for insert with check (auth.uid() = user_id);
create policy "resumes_update" on public.resumes for update using (auth.uid() = user_id);
create policy "resumes_delete" on public.resumes for delete using (auth.uid() = user_id);

-- subscriptions
create policy "subscriptions_select" on public.subscriptions for select using (auth.uid() = user_id);
create policy "subscriptions_update" on public.subscriptions for update using (auth.uid() = user_id);

-- daily_apply_usage
create policy "usage_select" on public.daily_apply_usage for select using (auth.uid() = user_id);
create policy "usage_insert" on public.daily_apply_usage for insert with check (auth.uid() = user_id);
create policy "usage_update" on public.daily_apply_usage for update using (auth.uid() = user_id);
