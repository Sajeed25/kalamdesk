# KalamDesk

Person-first daily operations and task tracker for Robokalam (Hyderabad / Warangal, IST).
**This repo is Phase 1 (MVP).** The database schema already contains every table for Phases 2–3.

## What Phase 1 includes

| Area | Status |
|---|---|
| Email + password auth, 12h sessions, login throttling, 4 roles (Founder / Manager / Employee / Intern) | done |
| Employee directory (no bank data), DPDP consent notice at first login, audit-log table | done |
| Tasks: priority, complexity, due, assignees, status flow, Blocked-needs-reason, proof-before-Done, comments + @mentions, activity log | done |
| Review: Approve / Send back (founders & managers); accept self-initiated work | done |
| Employee-created tasks: self-logged (tagged **Self-initiated**, shown on Founder's Desk) and requests to others | done |
| My Day (overdue → today → upcoming), Kanban with drag-and-drop (mouse + touch), List with sort, filters (person / dept / priority / tag) | done |
| Founder's Desk: person cards, red/amber/green health, overdue + blocked counts, last update | done |
| Quick-add (`N` or **+ New task**): `Raise invoice for Sunrise School @Pooja P1 tomorrow 5pm` | done |
| Email on assignment, status change, comment/mention, blocked, sent back, approved; in-app bell | done |
| Cron: 8:30 AM morning digest, 7 PM founder digest, 2-hour and overdue reminders | done |
| Password reset by email link, change password in Settings, invite emails for new people | done |
| People admin (founder): add / edit / deactivate, resend invite, last-founder guard, audit log | done |
| Edit tasks after creation (title, description, due date, assignees, priority, complexity); assignees are notified of priority/due changes | done |
| Department admin (founder): add, rename, recolour, delete-if-unused | done |
| Task checklist, file attachments (images, PDF, Office, CSV; 10 MB), full new-task form, month Calendar view | done |
| Light/dark mode, mobile bottom-nav, PWA manifest | done |
| Recurring tasks + check-in, daily stand-up, scoring/leaderboards, dashboards | Phase 2 (schema ready) |
| Incentives, referrals, encrypted bank details, snapshots, WhatsApp | Phase 3 (schema ready) |

## Architecture

```
 Browser (Next.js app router, Tailwind, dnd-kit; installable PWA)
    │  server components read via Prisma │ client components call /api/*
    ▼
 Next.js server ── src/lib/auth.ts      JWT cookie session (jose), bcrypt
    │              src/lib/rbac.ts      role helpers
    │              src/lib/tasks.ts     ALL task rules + visibility scope (single source of truth)
    │              src/lib/notify.ts    Channel fan-out: in-app · email · (whatsapp stub)
    │              src/lib/email.ts     SMTP via nodemailer (Hostinger-ready, console fallback in dev)
    ▼
 Prisma ──► SQLite (dev) / PostgreSQL (prod)

 Scheduler (Vercel Cron / GitHub Actions / any cron) ──► GET /api/cron/* with Bearer CRON_SECRET
```

Key decisions:

- **Authorisation is enforced in queries, not the UI.** `visibleWhere()` scopes every task read/write: founders see all, managers see themselves + direct reports, everyone else sees tasks they created or are assigned. A task outside your scope returns 404.
- **Notifications go through `Channel`s.** Adding WhatsApp Business API means writing one `Channel` (stub in `notify.ts`) — no caller changes.
- **Cron jobs are idempotent** (`JobRun` unique on kind+key), so a retried cron never double-sends.
- **Times are stored UTC and shown in IST** (`src/lib/time.ts`; IST is a fixed +05:30 offset).

```
prisma/schema.prisma      full data model (all phases)
prisma/seed.ts            7 departments, 2 founders, 2 managers, 6 employees, 3 interns, 14 tasks
src/lib/                  constants, auth, rbac, tasks, notify, email, desk, filters, quickadd, time
src/app/(app)/            desk · my-day · board · list · people · tasks/[id]
src/app/api/              auth · tasks · comments · notifications · me/consent · cron/{digest,reminders}
src/components/           Nav, Bell, QuickAdd, KanbanBoard, TaskRow, StatusMenu, Filters, Consent
```

## Setup

Requires Node 20+.

```bash
cd kalamdesk
npm install
cp .env.example .env        # then edit SESSION_SECRET and CRON_SECRET
npx prisma db push          # creates the SQLite database
npm run db:seed
npm run dev                 # http://localhost:3000
```

Demo logins (password for all seed users: `kalamdesk123`, **dev only**):

| Role | Email |
|---|---|
| Founder | arjun@robokalam.test, meera@robokalam.test |
| Manager | kiran@robokalam.test (BD Lead), suresh@robokalam.test (Head Trainer) |
| Employee | pooja@, ravi@, divya@, anil@, sneha@, imran@ `robokalam.test` |
| Intern | harsha@, lavanya@, nikhil@ `robokalam.test` |

Reset demo data: `npm run db:reset`.

## Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | `file:./dev.db` for SQLite, `postgresql://…` in production |
| `SESSION_SECRET` | ≥ 32 random chars; signs session cookies (`openssl rand -base64 32`) |
| `APP_URL` | public URL, used for links in emails |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | email over SMTP. Hostinger: `smtp.hostinger.com`, port `465` (or `587`), user = full mailbox address. If `SMTP_HOST` is empty, emails are logged to the server console |
| `CRON_SECRET` | bearer token required by `/api/cron/*` |
| `UPLOAD_DIR` | where attachments are stored (default `./uploads`) |
| `FIELD_ENCRYPTION_KEY` | Phase 3 only: 32-byte base64 key for bank/ID field encryption |

## Scheduled jobs

Call with header `Authorization: Bearer $CRON_SECRET`. Cron expressions are in **UTC** (IST = UTC+5:30):

| Job | IST | UTC cron |
|---|---|---|
| `GET /api/cron/digest?type=morning` (each person's due/overdue list) | 8:30 AM daily | `0 3 * * *` |
| `GET /api/cron/digest` (founder digest) | 7:00 PM daily | `30 13 * * *` |
| `GET /api/cron/reminders` (due in 2h, overdue nudge) | every 15 min | `*/15 * * * *` |

On Vercel, put these in `vercel.json` `crons` (Vercel sends the secret as `Authorization: Bearer $CRON_SECRET` when the env var is set).

## Deployment (Vercel + managed Postgres)

1. Create a Postgres database (Neon, Supabase or RDS).
2. In `prisma/schema.prisma` change `provider = "sqlite"` to `"postgresql"`. The schema uses no enums or JSON columns, so nothing else changes.
3. Set the environment variables above in your host. Use a **new** `SESSION_SECRET` and `CRON_SECRET`.
4. Run `npx prisma db push` (or `prisma migrate dev --name init` locally, then `prisma migrate deploy` in CI) against the production database.
5. Seed only if you want demo data. For real use, create your founders with a one-off script and **change every seed password**.
6. Create a mailbox in Hostinger (e.g. `desk@yourdomain.com`), put its credentials in the `SMTP_*` variables and set `EMAIL_FROM` to the same address. Check the domain has SPF/DKIM records enabled in hPanel so mail doesn't land in spam. Hostinger limits how many emails a mailbox may send per hour/day; the morning digest sends one email per person.
7. Enable daily database backups at the provider (Neon/Supabase/RDS all offer point-in-time recovery).

## Assumptions made (please confirm)

1. **SQLite locally, PostgreSQL in production.** The build environment had no Postgres; the schema is Postgres-compatible.
2. **Custom JWT sessions** instead of NextAuth or Supabase Auth, to keep Phase 1 small. Google sign-in and TOTP 2FA for admins are planned for Phase 3 (`User.totpSecret` is reserved). Password reset works by emailed single-use link (1 hour).
3. **Employees can assign to others only as a request.** A non-lead creating a task for a colleague is allowed; the assignee sees who raised it. If you'd rather block this, say so.
4. **Managers' scope = people whose profile lists them as `managerId`.** Founders see everyone.
5. **Health dot rules** (`src/lib/desk.ts`): red = 2+ overdue or any overdue P1; amber = 1 overdue, any blocked, or no activity in 24h with open work; else green. Easy to change.
6. **Attachments** use a local-disk driver (`UPLOAD_DIR`). On Vercel or multiple servers, swap `src/lib/storage.ts` for an S3-compatible bucket (the interface is three functions). The file type check uses the browser-declared type; downloads are forced as attachments with `nosniff`, so uploads can never render as pages. Add content sniffing before opening uploads to untrusted users.
6b. **Still missing:** bulk actions on the list, editing location / estimate / tags / proof-required after creation (the form sets them at creation), per-person calendar. Schema tables exist.
7. UI uses Tailwind with small custom components rather than the full shadcn/ui library.

## Security notes

- Passwords hashed with bcrypt; session cookie is httpOnly, SameSite=Lax, Secure in production.
- The login throttle is in-memory (per instance). Use a shared store (Redis/Upstash) when running multiple instances.
- No bank or ID data exists in Phase 1. Phase 3 design: AES-256-GCM field encryption, key from a secrets manager, masked by default, founder-only reveal with re-authentication, every reveal written to `AuditLog`, and never included in emails, exports or logs.
- Emails contain task titles and links only.
