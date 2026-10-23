-- ============================================================
-- JobBuddy Phase 5: Job Discovery Engine
-- Tables: jobs_cache, job_fetch_log
-- ============================================================

-- 1. jobs_cache: stores fetched job listings per user (6h cache)
create table if not exists public.jobs_cache (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  company      text not null,
  platform     text not null check (platform in ('greenhouse', 'lever', 'workable', 'wellfound')),
  url          text not null,
  location     text,
  salary       text,
  level        text check (level in ('junior', 'mid', 'senior', 'staff', 'lead', null)),
  match_score  integer not null default 0 check (match_score >= 0 and match_score <= 100),
  is_saved     boolean not null default false,
  description  text,
  fetched_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- Index for fast per-user query + sorting by match_score
create index if not exists jobs_cache_user_id_idx         on public.jobs_cache (user_id);
create index if not exists jobs_cache_match_score_idx     on public.jobs_cache (user_id, match_score desc);
create index if not exists jobs_cache_platform_idx        on public.jobs_cache (user_id, platform);
create index if not exists jobs_cache_fetched_at_idx      on public.jobs_cache (user_id, fetched_at desc);

-- 2. job_fetch_log: tracks last Brave API call timestamp per user (enforces 6h cache)
create table if not exists public.job_fetch_log (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  last_fetched_at timestamptz not null default now(),
  job_count       integer not null default 0,
  query_used      text
);

-- ── RLS ──
alter table public.jobs_cache    enable row level security;
alter table public.job_fetch_log enable row level security;

-- jobs_cache policies
create policy "jobs_cache_select"
  on public.jobs_cache for select
  using (auth.uid() = user_id);

create policy "jobs_cache_insert"
  on public.jobs_cache for insert
  with check (auth.uid() = user_id);

create policy "jobs_cache_update"
  on public.jobs_cache for update
  using (auth.uid() = user_id);

create policy "jobs_cache_delete"
  on public.jobs_cache for delete
  using (auth.uid() = user_id);

-- job_fetch_log policies
create policy "job_fetch_log_select"
  on public.job_fetch_log for select
  using (auth.uid() = user_id);

create policy "job_fetch_log_insert"
  on public.job_fetch_log for insert
  with check (auth.uid() = user_id);

create policy "job_fetch_log_update"
  on public.job_fetch_log for update
  using (auth.uid() = user_id);
