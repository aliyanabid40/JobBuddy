-- ============================================================
-- JobBuddy Phase 4: Resume Parsing & Profile Sections Schema + Storage
-- ============================================================

-- 1. Alter resumes table to store original file metadata
alter table public.resumes 
  add column if not exists file_name text,
  add column if not exists file_size bigint;

-- 2. Alter profiles table to ensure website_url exists
alter table public.profiles
  add column if not exists website_url text;

-- 3. Skills table
create table if not exists public.skills (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  category   text default 'General',
  created_at timestamptz not null default now()
);

-- 4. Work experiences table
create table if not exists public.experiences (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  company          text not null,
  title            text not null,
  location         text,
  start_date       text,
  end_date         text,
  is_current       boolean not null default false,
  description      text,
  responsibilities text[] default '{}',
  created_at       timestamptz not null default now()
);

-- 5. Education table
create table if not exists public.educations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  institution    text not null,
  degree         text,
  field_of_study text,
  start_date     text,
  end_date       text,
  gpa            text,
  created_at     timestamptz not null default now()
);

-- 6. Projects table
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  url          text,
  github_url   text,
  technologies text[] default '{}',
  created_at   timestamptz not null default now()
);

-- 7. Certifications table
create table if not exists public.certifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  issuer          text,
  issue_date      text,
  expiration_date text,
  credential_url  text,
  created_at      timestamptz not null default now()
);

-- ── RLS ──
alter table public.skills         enable row level security;
alter table public.experiences    enable row level security;
alter table public.educations     enable row level security;
alter table public.projects       enable row level security;
alter table public.certifications enable row level security;

-- Skills policies
create policy "skills_select" on public.skills for select using (auth.uid() = user_id);
create policy "skills_insert" on public.skills for insert with check (auth.uid() = user_id);
create policy "skills_update" on public.skills for update using (auth.uid() = user_id);
create policy "skills_delete" on public.skills for delete using (auth.uid() = user_id);

-- Experiences policies
create policy "experiences_select" on public.experiences for select using (auth.uid() = user_id);
create policy "experiences_insert" on public.experiences for insert with check (auth.uid() = user_id);
create policy "experiences_update" on public.experiences for update using (auth.uid() = user_id);
create policy "experiences_delete" on public.experiences for delete using (auth.uid() = user_id);

-- Educations policies
create policy "educations_select" on public.educations for select using (auth.uid() = user_id);
create policy "educations_insert" on public.educations for insert with check (auth.uid() = user_id);
create policy "educations_update" on public.educations for update using (auth.uid() = user_id);
create policy "educations_delete" on public.educations for delete using (auth.uid() = user_id);

-- Projects policies
create policy "projects_select" on public.projects for select using (auth.uid() = user_id);
create policy "projects_insert" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects_update" on public.projects for update using (auth.uid() = user_id);
create policy "projects_delete" on public.projects for delete using (auth.uid() = user_id);

-- Certifications policies
create policy "certifications_select" on public.certifications for select using (auth.uid() = user_id);
create policy "certifications_insert" on public.certifications for insert with check (auth.uid() = user_id);
create policy "certifications_update" on public.certifications for update using (auth.uid() = user_id);
create policy "certifications_delete" on public.certifications for delete using (auth.uid() = user_id);

-- ── Storage Bucket Setup & Policies ──
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "resumes_storage_select" on storage.objects
  for select using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "resumes_storage_insert" on storage.objects
  for insert with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "resumes_storage_update" on storage.objects
  for update using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "resumes_storage_delete" on storage.objects
  for delete using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
