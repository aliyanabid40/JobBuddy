# Architecture — JobBuddy

## 1. Stack
| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui | Fast UI, fewer tokens |
| Auth/DB/Storage | Supabase (Postgres, Auth, Storage, RLS) | One service for 3 needs |
| Resume AI | Google Gemini (`@google/genai`) | Free tier, structured JSON |
| Job discovery | Tavily Search API (`@tavily/core`) | Structured search API instead of scraping |
| Background jobs | Inngest | Long-running, retries, step logs |
| Browser automation | Browserbase + Stagehand | Cloud browser, AI form filling |
| Payments | Stripe (Checkout, Portal, Webhooks) | Subscriptions |
| Hosting | Vercel | Git-based deploy |
| Code review | CodeRabbit | PR review per phase |

## 2. High-Level Diagram
```
Browser (Next.js UI)
   |  Server Actions / Route Handlers
   v
Supabase Auth ── middleware/proxy guard ── Supabase Postgres (RLS)
   |                                         ^
   |  upload resume                          |
   v                                         |
Supabase Storage -> unpdf/mammoth -> Gemini -> profiles, skills, experience...
   
Jobs: UI -> /api/jobs -> (cache fresh? <6h) -> DB | else Tavily API -> normalize -> DB

Apply (AI): UI -> /api/apply -> job_applications(queued) -> Inngest event
   Inngest fn: detect-platform -> detect-fields (Browserbase/Stagehand)
            -> map-fields -> [missing? -> status=missing_info, wait for user]
            -> submit-application -> status=submitted|failed (+session_id)

Billing: UI -> Stripe Checkout -> webhook /api/stripe/webhook -> subscriptions, usage limits
```

## 3. Folder Structure
```
/src
  /app
    (marketing)/page.tsx            landing
    (auth)/sign-in, sign-up
    dashboard/
      layout.tsx                    sidebar shell
      jobs/ resume/ profile/ saved/ applications/ billing/
    api/
      jobs/route.ts
      apply/route.ts
      inngest/route.ts              MUST be public in middleware
      stripe/webhook/route.ts
  /components/ui                    shadcn
  /features/{jobs,profile,resume,apply,billing}/   components + hooks + actions
  /lib
    supabase/{client,server,admin}.ts
    ai/gemini.ts  resume-parser.ts  field-mapper.ts
    jobs/tavily.ts  query-builder.ts  match-score.ts
    automation/adapters/{greenhouse,lever,workable,wellfound}.ts
    inngest/{client,functions}.ts
    stripe/{client,plans}.ts
  middleware.ts (or proxy.ts)
/supabase/migrations
/docs  PRD.md Architecture.md rules.md phases.md Action.md
```

## 4. Data Model (Postgres, all tables RLS = `user_id = auth.uid()`)
- `profiles` (id=user_id, full_name, email, phone, location, github_url, linkedin_url, summary, onboarding_done)
- `skills`, `experiences`, `educations`, `projects`, `certifications` (FK user_id)
- `resumes` (user_id, storage_path, file_type, parse_status, created_at)
- `jobs` (id, user_id, title, company, platform, url, location, salary, level, match_score, is_saved, fetched_at)
- `job_applications` (id, user_id, job_id, status, detected_fields jsonb, missing_fields jsonb, browserbase_session_id, error, timestamps)
- `application_answers` (user_id, question_key, answer) — reusable answers for missing fields
- `subscriptions` (user_id, plan, stripe_customer_id, stripe_subscription_id, status, period_end)
- `daily_apply_usage` (user_id, date, count)
- `billing_history` (user_id, stripe_invoice_id, amount, status)
- `job_fetch_log` (user_id, last_fetched_at)

## 5. Application Status State Machine
`queued -> detecting_fields -> (missing_info -> ready) -> in_progress -> submitted`  
Any step may go to `failed` (stores error + session link). `missing_info -> ready` happens after the user saves answers.

## 6. Key Decisions
1. **Queue, not request/response** for agent work (runs 1-3 min).
2. **Adapters per platform** keyed on hostname; unknown host = `unsupported`.
3. **Cache jobs 6h** to protect Tavily credits.
4. **Service-role key server-only**, used by Inngest functions to write on behalf of users.
5. **Limits enforced server-side** (`daily_apply_usage`) — never trust UI.
6. **AI model name in env** (`GEMINI_MODEL`) because models get retired.

## 7. Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL  NEXT_PUBLIC_SUPABASE_ANON_KEY  SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY  GEMINI_MODEL
TAVILY_API_KEY
BROWSERBASE_API_KEY  BROWSERBASE_PROJECT_ID  STAGEHAND_MODEL
INNGEST_EVENT_KEY  INNGEST_SIGNING_KEY  INNGEST_DEV
STRIPE_SECRET_KEY  STRIPE_WEBHOOK_SECRET  NEXT_PUBLIC_APP_URL
```

## 8. Deployment
Vercel (env vars copied) -> Inngest Cloud sync `https://<domain>/api/inngest` (+ Vercel deployment-protection bypass secret) -> Stripe live webhook to `https://<domain>/api/stripe/webhook`.
