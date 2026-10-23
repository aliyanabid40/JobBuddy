-- ============================================================
-- Migration 006: Add extended job fields to jobs_cache
-- Matches Phase 5 user specifications
-- ============================================================

ALTER TABLE public.jobs_cache
  ADD COLUMN IF NOT EXISTS company_logo text,
  ADD COLUMN IF NOT EXISTS job_type text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS job_url text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS applied_status text DEFAULT 'not_applied',
  ADD COLUMN IF NOT EXISTS saved_status boolean DEFAULT false;

-- Create view public.jobs pointing to jobs_cache for dual compatibility
CREATE OR REPLACE VIEW public.jobs WITH (security_invoker = true) AS
  SELECT 
    id,
    user_id,
    platform,
    title,
    company,
    company_logo,
    location,
    salary,
    COALESCE(job_type, 'Full-time') AS job_type,
    COALESCE(experience_level, level) AS experience_level,
    description,
    tags,
    match_score,
    COALESCE(job_url, url) AS job_url,
    COALESCE(source_url, url) AS source_url,
    applied_status,
    COALESCE(saved_status, is_saved) AS saved_status,
    fetched_at,
    created_at
  FROM public.jobs_cache;
