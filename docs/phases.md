# phases.md — Build Phases

Each phase = 1 branch + 1 PR. Do not start a phase until the previous one is merged and its "Done when" checklist passes.

| # | Phase | Output | Done when |
|---|-------|--------|-----------|
| 0 | Docs & Rules | PRD, Architecture, rules, phases, Action in `/docs` | All reviewed by me |
| 1 | Project Setup | Next.js + TS + Tailwind + shadcn (all components), GitHub repo, CodeRabbit, `npm run dev` works | App runs, repo pushed, CodeRabbit comments on a test PR |
| 2 | Supabase DB + Auth | Tables + RLS, Google/email auth, sign-in/up pages, middleware guard | Unauth user cannot open `/dashboard`; user row saved on login |
| 3 | Dashboard Layout | Collapsible sidebar: Jobs, Resume, Profile, Applications, Saved, Billing | Collapses to icons, responsive, theme color set |
| 4 | Resume Upload & Parsing | Blocking onboarding dialog, Storage bucket, Gemini parse, editable Profile tabs, completeness % | New user is blocked until upload; fields auto-filled and editable |
| 5 | Job Listing | Brave query builder, 6h cache, platform filter, list cards w/ match %, completeness + recent activity cards | Real, fresh jobs from 4 platforms; no API call within 6h |
| 6 | Apply Flow + Automation | Apply dialog, Inngest, Browserbase/Stagehand adapters, field detection, missing-data dialog, AI autofill, status page | End-to-end submit on a test Greenhouse/Lever job; failures logged |
| 7 | Save Jobs | Save toggle + toast + Saved page | Save/unsave works, persists |
| 8 | Billing & Limits | Plans, Stripe Checkout/Portal/webhooks, usage table, limit enforcement, free = top 10 jobs | Test card upgrades plan; limit changes 5 -> 25 |
| 9 | Landing Page | Hero, features, how-it-works, testimonials, pricing, footer | Lighthouse OK, CTA -> sign in |
| 10 | Deploy & Harden | Vercel, Inngest Cloud sync, live Stripe webhook, error monitoring, rate limits | Production apply + payment work |
| 11 | Post-MVP | Email notifications, more platforms, cover letters, retries UI | Backlog |
