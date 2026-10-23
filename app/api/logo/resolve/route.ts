import { NextRequest, NextResponse } from "next/server";
import {
  batchResolveLogos,
  logLogoResolutionTable,
  LOGO_RETRY_DAYS,
  type LogoResolveInput,
  type LogoSource,
  type ResolvedLogoResult,
} from "@/lib/logo/resolveLogo";
import { persistCompanyLogos } from "@/lib/jobs/cache";
import { createClient } from "@/lib/supabase/server";

/** Shape of each job sent by the client so we can print a full diagnostic table. */
interface IncomingJob extends LogoResolveInput {
  logo_source?: string | null;
  logo_checked_at?: string | null;
}

const RETRY_WINDOW_MS = LOGO_RETRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * POST /api/logo/resolve
 *
 * Body: { jobs: [{ company, company_logo, company_domain, logo_source,
 *                  logo_checked_at, description }] }
 *
 * Resolves every company that has no valid logo yet (or whose last check is
 * older than 7 days), persists the outcome per company, and returns the
 * resolved results. Logos are never resolved in the browser: this avoids CORS
 * and lets each company be resolved exactly once.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const incoming: IncomingJob[] = Array.isArray(body?.jobs) ? body.jobs : [];

    if (incoming.length === 0) {
      return NextResponse.json({ ok: true, results: [] });
    }

    const now = Date.now();
    const cachedResults: ResolvedLogoResult[] = [];
    const needsResolution: LogoResolveInput[] = [];

    for (const job of incoming) {
      const company = (job.company ?? "").trim();
      if (!company) continue;

      const hasLogo = typeof job.company_logo === "string" && job.company_logo.startsWith("http");
      const checkedAt = job.logo_checked_at ? new Date(job.logo_checked_at).getTime() : 0;
      const isFresh = Number.isFinite(checkedAt) && checkedAt > 0 && now - checkedAt < RETRY_WINDOW_MS;

      if (hasLogo || isFresh) {
        // Already resolved and still within the retry window - reuse as-is.
        cachedResults.push({
          company,
          domain: job.company_domain ?? null,
          logoUrl: hasLogo ? job.company_logo! : null,
          source: (job.logo_source as LogoSource) ?? "source_api",
          width: null,
          height: null,
          attempts: [],
        });
      } else {
        needsResolution.push({
          company,
          company_logo: job.company_logo ?? null,
          company_domain: job.company_domain ?? null,
          description: job.description,
          job_url: job.job_url,
        });
      }
    }

    const resolved = await batchResolveLogos(needsResolution);

    // Diagnostic table covers ALL loaded jobs, cached and freshly resolved.
    logLogoResolutionTable([...cachedResults, ...resolved]);

    // Persist only the freshly resolved companies (best-effort, never fatal).
    if (resolved.length > 0) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await persistCompanyLogos(user.id, resolved);
        }
      } catch (persistError) {
        console.warn("[logo/resolve] persist skipped:", persistError);
      }
    }

    return NextResponse.json({ ok: true, results: resolved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[logo/resolve] error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
