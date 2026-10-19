# Action.md — Step-by-step Execution Guide

Mode: Plan first, then Build. One phase per conversation/agent.

## Prompt template (use for every phase)
```
GOAL: <what to build>
CONTEXT: Read /docs/PRD.md, Architecture.md, rules.md. We are in Phase <N>.
TOOLS/STACK: <only what this phase needs>
UI/UX: <screens, components, behaviour>
ACCESS RULES: <who can see/do what>
SECURITY: <RLS, secrets, validation>
OUT OF SCOPE: <what not to touch>
OUTPUT: plan first; then list files changed, manual steps, test steps.
```

## Phase 1 — Setup (do manually, saves tokens)
- [ ] `npx create-next-app@latest jobbuddy` (TS, Tailwind, App Router)
- [ ] `npx shadcn@latest init` then `npx shadcn@latest add --all`
- [ ] Put `/docs/*.md` in repo
- [ ] Create GitHub repo, push, connect CodeRabbit
- [ ] `npm run dev` works

## Phase 2 — Supabase
- [ ] Create Supabase project; connect Supabase MCP in Antigravity
- [ ] Prompt: tables from Architecture §4, RLS, Google + email auth, sign-in/up/dashboard pages, middleware guard, save user on login
- [ ] Manual: enable Google provider (client ID/secret), add env keys
- [ ] Test: logged-out -> redirected; logged-in -> dashboard

## Phase 3 — Layout
- [ ] Prompt: sidebar (logo, Jobs/Resume/Profile/Applications/Saved, footer Billing & Credits), collapsible, bigger items, primary color `<hex>`

## Phase 4 — Resume
- [ ] Get `GEMINI_API_KEY` (AI Studio), pick current model, put in `GEMINI_MODEL`
- [ ] Prompt: onboarding dialog blocks dashboard, upload PDF/DOCX -> private bucket -> extract -> Gemini JSON -> save -> Profile tabs (Personal, Summary, Skills, Experience, Education, Projects, Certs), completeness ring, Resume page
- [ ] Test with 2-3 real resumes (bad PDF too)

## Phase 5 — Jobs
- [ ] Get Brave API key
- [ ] Prompt: query builder per platform (`site:boards.greenhouse.io ...`), normalize to `jobs`, cache 6h via `job_fetch_log`, list cards, platform filter + logos, match %
- [ ] Tip: paste a REAL Brave response JSON into the prompt so the agent knows the shape
- [ ] Add image domains to `next.config`

## Phase 6 — Automation (hardest; use Planning mode)
- [ ] Keys: Browserbase API key + project ID, Supabase service role, Stagehand model, Inngest dev
- [ ] Run Inngest dev server; make sure `/api/inngest` is public in middleware and app is synced
- [ ] Prompt A: apply dialog + `job_applications` + Inngest events + platform detection
- [ ] Prompt B: detect fields via Stagehand, map to profile, mark missing
- [ ] Prompt C: missing-data dialog (scrollable) + AI autofill + save answers
- [ ] Prompt D: submit step; resume upload field uses Supabase signed URL; if field unknown -> ask user, never guess legal questions
- [ ] Test each failure: watch Inngest run + Browserbase session replay, paste error back, iterate

## Phase 7 — Save Jobs
- [ ] Add `is_saved` flag, toggle + toast, Saved page

## Phase 8 — Billing
- [ ] Stripe sandbox keys, install Stripe CLI, `stripe listen --forward-to localhost:3000/api/stripe/webhook` -> put signing secret in env
- [ ] Events: checkout.session.completed, customer.subscription.updated/deleted, invoice.paid, invoice.payment_failed
- [ ] Prompt: plans (Free 5/day & top 10 jobs, Pro 25/day, Unlimited), checkout, portal, usage table, server-side limits, billing page + history
- [ ] Run the Supabase migration; test card 4242 4242 4242 4242

## Phase 9-10 — Landing & Deploy
- [ ] Landing prompt; `npm run build` locally first
- [ ] Vercel import, paste env vars
- [ ] Inngest Cloud: sync `https://<domain>/api/inngest` + Vercel protection-bypass key
- [ ] Stripe live webhook with real domain
- [ ] Smoke test: sign-in, upload, jobs, AI apply, payment

## Per-phase ritual
1. Plan -> review -> Build
2. `npm run build && npm run lint`
3. New branch -> commit -> PR -> fix CodeRabbit comments -> merge
4. Update `phases.md` checkboxes
