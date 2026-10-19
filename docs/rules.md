# rules.md — Rules for the AI Agent (Antigravity)

Read PRD.md, Architecture.md and Action.md before doing anything. If a request conflicts with them, stop and ask.

## Workflow
1. Work on ONE phase at a time (see phases.md). Never start the next phase on your own.
2. Always produce a plan first (files to create/change, DB changes, env vars, risks) and wait for approval before big changes.
3. After finishing: list what changed, manual steps for me (env keys, migrations), and how to test.
4. Do not refactor or "improve" unrelated code.
5. If something is unclear, ask. Do not invent APIs, model names or SDK methods — read the official docs first.

## Code
- TypeScript strict. No `any`; define types (e.g. `JobRow`).
- Next.js App Router, server components by default; `"use client"` only when needed.
- Use shadcn/ui components already installed; Tailwind only; no new UI libs without asking.
- Validate all inputs with zod. Return typed results `{ ok, data, error }`.
- Small files, one responsibility. Feature code lives in `/features/<name>`.
- No dead code, no console.log in committed code.

## Security
- Never expose secrets to the client. Service-role key only in server code / Inngest.
- Every table has RLS; every migration includes policies.
- Resume bucket is private; use signed URLs.
- Never log PII (resume text, phone, email).
- Verify Stripe webhook signatures. Enforce plan limits server-side.

## AI / Automation
- Model names come from env vars.
- The agent must NEVER guess legal/eligibility answers (work authorization, sponsorship, disability, demographics). Mark as missing and ask the user.
- Always store Browserbase session ID and error message on failure.
- Automation steps live in Inngest `step.run` blocks so they retry independently.
- Only supported hostnames (greenhouse, lever, workable, wellfound). Others = `unsupported`.
- No scraping of login-walled sites. Use Brave Search API for discovery.

## Database
- Migrations only via `/supabase/migrations`; never edit the DB by hand without a migration file.
- Reuse existing tables/columns when possible (e.g. `jobs.is_saved` instead of a new table).

## Git
- Branch per phase: `phase-N-short-name`. Conventional commits.
- `npm run build` and `npm run lint` must pass before commit.
- Open a PR; fix CodeRabbit comments before merge to `main`.

## Debugging
- When I paste an error: find root cause, fix, explain in 2-3 lines. No band-aids.
- Check docs/real API response shape before changing parsing code.
