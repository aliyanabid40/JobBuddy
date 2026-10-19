# PRD — JobBuddy (AI Job Application Agent)

## 1. Vision
A SaaS web app where a user uploads a resume once, gets an auto-filled profile, sees fresh matching jobs, and can apply either manually or via an AI agent that fills and submits the form in the background.

## 2. Target Users
- Job seekers applying to many roles (devs first), who hate repetitive forms.
- Secondary: freelancers/agencies applying on behalf of clients (future).

## 3. Core Problems
1. Same data typed into every application form.
2. Finding fresh, relevant postings across boards takes time.
3. No single place to track application status.

## 4. Goals (MVP)
- Resume upload -> AI parsing -> editable profile with completeness %.
- Job feed from Greenhouse, Lever, Workable, Wellfound (no login/captcha boards only).
- Apply Manually (open job URL) or Apply with AI Agent.
- Missing-field detection + "Fill missing data" dialog + AI autofill.
- Application status dashboard (queued / detecting / missing info / in progress / submitted / failed).
- Save jobs for later.
- Plans: Free / Pro / Unlimited with daily apply limits via Stripe.

## 5. Non-Goals (MVP)
- LinkedIn/Indeed automation (login + captcha + ToS risk).
- Mobile app, team accounts, cover-letter generator, interview prep.

## 6. User Stories
| ID | As a... | I want... | So that... |
|----|---------|-----------|-----------|
| U1 | new user | to sign in with Google/email | I can access my dashboard |
| U2 | new user | to be blocked until I upload a resume | my profile is always seeded |
| U3 | user | resume fields auto-mapped to profile | I don't retype anything |
| U4 | user | to edit profile and see completeness % | I know what is missing |
| U5 | user | a list of jobs matched to my profile with match % | I focus on relevant roles |
| U6 | user | to filter by platform | I narrow results |
| U7 | user | to apply manually or with AI | I choose control vs speed |
| U8 | user | to be told which form fields are missing | I can supply answers |
| U9 | user | AI autofill for missing answers | it is faster |
| U10 | user | to track each application status | I know what happened |
| U11 | user | to save jobs | I apply later |
| U12 | user | to upgrade my plan | I can apply to more jobs/day |

## 7. Functional Requirements
- **Auth:** Supabase Auth (Google + email/password). Middleware protects `/dashboard/*`.
- **Resume:** PDF/DOCX upload -> Supabase Storage bucket `resumes` -> text extract (unpdf / mammoth) -> Gemini structured parse -> save to profile tables.
- **Jobs:** Build query from profile (title, skills, location) + selected platforms -> Brave Search API -> normalize -> cache in DB. Refresh only if `last_fetched_at` > 6h. Match % computed from skills/title overlap.
- **Apply flow:** Dialog (Manual / AI). AI path creates `job_applications` row (status `queued`) and sends an Inngest event.
- **Agent:** Inngest function steps: detect platform -> open Browserbase session (Stagehand) -> detect form fields -> map to profile -> if gaps then status `missing_info` else fill + submit -> save status + session ID.
- **Billing:** Free = 5 AI applies/day, top 10 jobs visible. Pro = 25/day. Unlimited = no cap. Stripe Checkout + Customer Portal + webhooks. (Prices TBD — transcript is inconsistent: "<$10" vs $19.)
- **Landing page:** hero, features, how it works, testimonials, pricing, footer.

## 8. Non-Functional Requirements
- Long jobs never block HTTP requests (background queue).
- All user data protected by Supabase RLS.
- Secrets only in env vars; never in client bundle.
- Cost: Brave free credit ($5/mo) respected via caching.
- Audit trail: every agent run stores session ID + step logs.

## 9. Success Metrics
- Resume -> profile completion rate > 90%.
- AI apply success rate (submitted / attempted) > 60%.
- Free -> paid conversion; daily active users; avg apply time.

## 10. Risks
| Risk | Mitigation |
|------|-----------|
| Form layouts change, agent fails | Per-platform adapters, retries, failure status + replay |
| Platform ToS / spam concerns | Rate limits, user confirmation before submit, only no-login boards |
| Wrong answers on legal questions (sponsorship, work auth) | Never guess; ask user, store answer, show before submit |
| LLM model names get deprecated | Model name in env var, not hard-coded |
| PII leakage | RLS, private bucket, no PII in logs |
