-- ============================================================
-- Migration 007: company logo cache columns + one-time invalidation
--
-- Adds the state needed to resolve each company's logo exactly once:
--   company_domain   -> the company's own website domain (not the ATS domain)
--   logo_source      -> which strategy produced the logo
--                      (source_api | website | logo_api | favicon | letter_avatar)
--   logo_checked_at  -> when the logo was last resolved; failed (null) logos
--                      are retried after ~7 days
--
-- It also invalidates every previously stored logo once, because older rows may
-- contain the generic globe icon returned by favicon services. Logos are then
-- re-resolved through the validated pipeline in lib/logo/resolveLogo.ts.
-- ============================================================

ALTER TABLE public.jobs_cache
  ADD COLUMN IF NOT EXISTS company_domain text,
  ADD COLUMN IF NOT EXISTS logo_source text,
  ADD COLUMN IF NOT EXISTS logo_checked_at timestamptz;

-- One-time invalidation of the old logo cache (rejected / generic images).
UPDATE public.jobs_cache
  SET company_logo = NULL,
      logo_source = NULL,
      logo_checked_at = NULL
  WHERE company_logo IS NOT NULL;

-- Speeds up the per-company lookup used when persisting resolved logos.
CREATE INDEX IF NOT EXISTS jobs_cache_user_company_idx
  ON public.jobs_cache (user_id, company);
