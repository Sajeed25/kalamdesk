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
| Recurring tasks (daily / weekdays / chosen weekdays / monthly), generated ahead of time, one task per person; Missed when not done by end of day | done (Phase 2) |
| Field check-in with server timestamp and optional GPS | done (Phase 2) |
| Daily stand-up (finished / pending / obstacle), obstacles alert founders, missing updates flagged on the Desk, stand-up review page | done (Phase 2) |
| Scoring with editable weights, penalties, impact stars, initiative bonus, explainable on hover; weekly / monthly / all-time leaderboards for employees and interns, by department | done (Phase 2) |
| Weekly and monthly dashboards (Recharts), CSV export, Monday and 1st-of-month summary emails | done (Phase 2) |
| Encrypted bank and ID details (AES-256-GCM), masked by default, founder-only reveal with password re-check, every reveal audited | done (Phase 3) |
| Incentive rules (targets or top-N), monthly calculation, founder approval, paid tracking, per-person history | done (Phase 3) |
| Referral programs and pipeline (Submitted to Reward paid), rewards flow into incentives | done (Phase 3) |
| Published dashboard snapshots: link for signed-in staff + PDF, revocable | done (Phase 3) |
| WhatsApp alerts via the Cloud API, opt-in per person, template based | done (Phase 3), needs your Meta setup |
| 2FA / Google sign-in, ID document uploads (offer letters, ID scans), automated backups | not built yet |

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
 Prisma ──► MySQL

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

Requires Node 20+ and a MySQL database (local MySQL/XAMPP for development, or Hostinger MySQL).

```bash
cd kalamdesk
npm install
cp .env.example .env        # then edit SESSION_SECRET and CRON_SECRET
npx prisma db push          # creates the tables in your MySQL database
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
| `DATABASE_URL` | `mysql://USER:PASSWORD@localhost:3306/DBNAME` (URL-encode special characters in the password) |
| `SESSION_SECRET` | ≥ 32 random chars; signs session cookies (`openssl rand -base64 32`) |
| `APP_URL` | public URL, used for links in emails |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | email over SMTP. Hostinger: `smtp.hostinger.com`, port `465` (or `587`), user = full mailbox address. If `SMTP_HOST` is empty, emails are logged to the server console |
| `CRON_SECRET` | bearer token required by `/api/cron/*` |
| `UPLOAD_DIR` | disk fallback for attachments (default `./uploads`); normally files live in the database |
| `FIELD_ENCRYPTION_KEY` | 32-byte base64 key for bank/ID encryption. Required to save or view bank details. See "Bank details" below |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE`, `WHATSAPP_LANG` | optional WhatsApp alerts. Off unless the first three are set |
| `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | optional: let staff reply DONE/START/BLOCKED on WhatsApp (webhook `/api/inbound/whatsapp`) |
| `BOOTSTRAP_ORG_NAME` | optional: name of the first organisation created by the first-founder bootstrap (default `Robokalam`) |
| `RESET_2FA_EMAILS` | emergency only: switches off two-step sign-in for these emails at startup. Delete after use |

## Scheduled jobs

Call with header `Authorization: Bearer $CRON_SECRET`. Cron expressions are in **UTC** (IST = UTC+5:30):

| Job | IST | UTC cron |
|---|---|---|
| `GET /api/cron/digest?type=morning` (each person's due/overdue list) | 8:30 AM daily | `0 3 * * *` |
| `GET /api/cron/digest` (founder digest) | 7:00 PM daily | `30 13 * * *` |
| `GET /api/cron/reminders` (due in 2h, overdue nudge) | every 15 min | `*/15 * * * *` |

On Vercel, put these in `vercel.json` `crons` (Vercel sends the secret as `Authorization: Bearer $CRON_SECRET` when the env var is set).

## Deployment (Hostinger Node.js + MySQL)

1. In hPanel go to Databases, create a MySQL database and user, and note the host (usually `localhost`), database name, user and password.
2. Put them in `DATABASE_URL`, then run `npx prisma db push` once on the server and create your first founder (see "First login" below).
3. Set the environment variables above in your host. Use a **new** `SESSION_SECRET` and `CRON_SECRET`.
4. Run `npx prisma db push` (or `prisma migrate dev --name init` locally, then `prisma migrate deploy` in CI) against the production database.
5. Seed only if you want demo data. For real use, create your founders with a one-off script and **change every seed password**.
6. Create a mailbox in Hostinger (e.g. `desk@yourdomain.com`), put its credentials in the `SMTP_*` variables and set `EMAIL_FROM` to the same address. Check the domain has SPF/DKIM records enabled in hPanel so mail doesn't land in spam. Hostinger limits how many emails a mailbox may send per hour/day; the morning digest sends one email per person.
7. Enable daily database backups at the provider (Neon/Supabase/RDS all offer point-in-time recovery).

## Assumptions made (please confirm)

1. **MySQL** (the schema sets explicit column sizes because MySQL cannot default TEXT columns). The SQL was generated and inspected with Prisma but not run against a live MySQL server in the build environment; the first `db push` on your server is the real test.
2. **Custom JWT sessions** instead of NextAuth or Supabase Auth, to keep Phase 1 small. Google sign-in and TOTP 2FA for admins are planned for Phase 3 (`User.totpSecret` is reserved). Password reset works by emailed single-use link (1 hour).
3. **Employees can assign to others only as a request.** A non-lead creating a task for a colleague is allowed; the assignee sees who raised it. If you'd rather block this, say so.
4. **Managers' scope = people whose profile lists them as `managerId`.** Founders see everyone.
5. **Health dot rules** (`src/lib/desk.ts`): red = 2+ overdue or any overdue P1; amber = 1 overdue, any blocked, or no activity in 24h with open work; else green. Easy to change.
6. **Attachments** are stored in the database (table `FileBlob`, see Phase 7) so they survive redeploys; the local disk (`UPLOAD_DIR`) is only a fallback. Photos and PDFs open in the browser; every other type downloads. Uploads are checked against the file's real content (a script renamed to .jpg is refused), served with `nosniff`, never cached, and inline images carry a locked-down content policy.
6b. **Still missing:** bulk actions on the list, editing location / estimate / tags / proof-required after creation (the form sets them at creation), per-person calendar, a reminder nudge for missing stand-ups (they are flagged on the Desk and in the 7 PM digest). Schema tables exist.
7. UI uses Tailwind with small custom components rather than the full shadcn/ui library.

## Security notes

- Passwords hashed with bcrypt; session cookie is httpOnly, SameSite=Lax, Secure in production.
- The login throttle is in-memory (per instance). Use a shared store (Redis/Upstash) when running multiple instances.
- Bank and ID data (Phase 3) is encrypted with AES-256-GCM, masked by default, founder-only, revealed only after re-entering the password, and every reveal is written to `AuditLog`. It is never included in emails, exports, snapshots or logs.
- Emails contain task titles and links only.

## First login on a fresh deployment

The demo accounts (`*@robokalam.test`) only exist where you ran `npm run db:seed`. On a new live database there are **no users**, so create your first founder with your real email:

```bash
npx prisma db push                      # creates the tables (once, and after schema changes)
npm run create-founder -- --email you@yourdomain.com --name "Your Name" --password "a-long-password"
```

Then sign in and add everyone else from **People → Add person**; they get an invite email to set their own password. Do not run `db:seed` in production.

Open `/api/health` on the live site to see what's missing. It reports only yes/no flags: `sessionSecretOk`, `databaseUrlSet`, `dbReachable`, `schemaReady`, `hasUsers`.

## Scheduled jobs on Hostinger (Node.js cron)

In hPanel → Advanced → Cron Jobs, choose **Node.js** and create **one** job:

- Command (the part after the pre-filled prefix): `scripts/cron.js`
- Schedule: every 15 minutes (`*/15 * * * *`)

`CRON_SECRET` and `APP_URL` must be in the `.env` file the cron prefix loads (`--env-file=…`). The script sends reminders every run, the 8:30 AM IST digest once that time has passed, and the 7 PM IST founder digest once that time has passed. IST is computed inside the script, so the server's timezone doesn't matter, and the server makes each digest idempotent per day.

## Setup without a terminal (Hostinger shared hosting)

1. **Create the tables:** hPanel > Databases > Management > open **phpMyAdmin** for your database > **Import** tab > choose `prisma/mysql-init.sql` from this repo > Go. (Or open the **SQL** tab and paste its contents.) Run it once on an empty database. After future schema changes, regenerate it with `npm run db:sql` and apply only the new parts.
2. **Create the first admin:** in the Node.js app's environment variables set `BOOTSTRAP_FOUNDER_EMAIL`, `BOOTSTRAP_FOUNDER_NAME` and `BOOTSTRAP_FOUNDER_PASSWORD` (10+ characters), then restart. On start-up, if the database has no users, the app creates that founder and the default departments. Sign in, then **delete these three variables**.
3. Open `/api/health` and confirm `"ok": true`.

## Phase 2: how it works

**No database change.** Phase 2 uses tables that already exist, so a live MySQL database needs no new SQL. Just redeploy.

**Scheduler.** The single `scripts/cron.js` job (every 15 minutes) now also: creates upcoming recurring tasks, closes missed ones, applies the daily overdue penalty, and sends the weekly (Monday 9 AM IST) and monthly (1st, 9 AM IST) summaries. Nothing to add on Hostinger if the job already exists. Vercel users: `vercel.json` lists the extra routes.

**Recurring activities** (founders and managers, *Recurring* in the menu). Rule examples: every Tuesday 10:00; every Saturday and Sunday 09:30; day 1 of every month; every weekday. Each occurrence is created as a task N hours ahead (default 12) for each assignee separately. If it is not Done by the end of that IST day it becomes **Missed**: the task is closed (Cancelled, logged), the person gets the missed-activity penalty once, and they are notified. Done after its time but the same day is **Late**. Managers can only assign recurring work to their own team.

**Scoring** (weights editable by founders in Scores > Scoring settings):

| Part | Default |
|---|---|
| Base points | P1 10, P2 7, P3 5, P4 3 |
| Complexity multiplier 1 to 5 | 1.0, 1.2, 1.5, 1.8, 2.2 |
| Timeliness | on time 1.0, late under 24h 0.7, later 0.4 |
| Founder impact rating | 2 points per star (0 to 5 stars, set when approving) |
| Initiative | +2 for self-initiated work a founder accepted |
| Penalties | missed recurring -3; open task overdue over 3 days with no Blocked reason -2 |

Rules worth knowing: points are earned when a task becomes Done, and removed if it is reopened or sent back (so they can be re-earned, never double counted). Changing a done task's priority or complexity re-scores it. A task with several assignees gives each person the full points. Blocked tasks are never penalised, so raising a blocker early is always safe. Weight changes apply to tasks completed afterwards; past events keep the explanation they were scored with. Hover any score to see its last events.

**Who sees what.** Everyone sees the ranking and points. Detailed metrics (on-time %, P1/P2 rate, blockers, recurring %) are shown to founders for everyone, to managers for their team, and to each person for themselves. Founders are not ranked. CSV export is for founders and managers (managers get their team only).

**Phase 2 assumptions to confirm:** a missed recurring task is closed as Cancelled (and shown outlined in red on the Calendar) so it stops cluttering My Day; employees and managers share one leaderboard while interns have their own; metrics count a task in the period of its due date (or creation date when it has none).

## Phase 3: how it works

### Upgrading an existing database (do this BEFORE redeploying)

Phase 3 adds a few columns. They are all optional or have defaults, so the change is safe for your live data and old code keeps working.

1. In phpMyAdmin, open your database, then the **SQL** tab, paste the contents of `prisma/phase3-upgrade.sql` and run it **once**. (Running it twice shows "Duplicate column" errors; they are harmless.)
2. Only then redeploy the new code. The new code reads the new columns, so deploying first breaks the People, Desk and Settings pages until the SQL is run.
3. Check `/api/health`: it must show `"phase3Schema": true`. If it shows `false`, the SQL has not been applied.

New installs use `prisma/mysql-init.sql`, which already includes everything.

### Bank details

- **Set the key first.** Generate one (PowerShell): `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`, then set it as `FIELD_ENCRYPTION_KEY` in your server environment and restart. `/api/health` shows `encryptionKeyOk`.
- **Back the key up somewhere safe and separate** (a password manager). If it is lost, saved bank and ID details cannot be recovered; changing it makes existing ones unreadable.
- Founders open **People > a person > Edit > Bank and ID details**. Values are encrypted with AES-256-GCM before they reach the database, and each value is bound to its person and field, so a ciphertext copied elsewhere will not decrypt.
- The page shows only masked values and the last 4 digits of the account. **Reveal** asks for the founder's password again, shows the values for 30 seconds, and writes an audit entry (who, whose, when, never the values). Reveals are limited to 20 per hour. The re-check cookie lasts 5 minutes, is separate from the login session, and cannot be used to sign in.
- Managers, employees and interns get a 403 from the API as well as a redirect from the page. Bank and ID values are never in emails, CSV exports, snapshots, notifications, audit entries or server logs (this is checked by the automated tests).

### Incentives

Founders define rules in **Incentives**: *meets targets* (for example at least 200 points and 90% on time in the month) or *top N by points* within employees or within interns. **Calculate** (or the 1st-of-month cron, which also notifies founders) creates *pending* awards, never more than one per person per rule per month. You approve or reject each one, then mark it paid. A rejected award is not regenerated. A person with nothing delivered in the month is never rewarded by a targets rule. Employees see only their approved awards and the active rules. Founders can also add a manual award.

### Referrals

Founders open programs (name, reward text, optional rupee amount, optional end date). Anyone can submit a referral; the referred person's contact details are visible only to founders and the referrer. Founders move referrals along Submitted, Contacted, Qualified, Converted, Reward paid. **Converted** creates one pending incentive award for the referrer (if the program has an amount); **Reward paid** marks it approved and paid.

### Published dashboard snapshots

On the Dashboard, founders press **Publish snapshot** (weekly or monthly). It freezes the numbers and gives a link plus a PDF (tables and simple bars, no live charts). The link works only for signed-in staff, not the public, and can be removed at any time. Staff are notified in the app, and by email if you tick the box.

### WhatsApp alerts

1. Create a WhatsApp Business Cloud API app in Meta Business Manager and an approved **template** whose body has exactly three variables, for example: `{{1}} - {{2}}  Open: {{3}}`.
2. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE` (and `WHATSAPP_LANG` if not `en`), then restart.
3. Each person opts in under **Settings > WhatsApp alerts** with their mobile number and a consent tick. Nothing is sent without it, opting out is one click, and both are audited.
Only new assignments, blockers, sent-back work, approvals and reminders are sent; comments and digests stay in the app and email. In-app and email delivery never depend on WhatsApp.

### Phase 3 assumptions to confirm

- Snapshot links need a login (safer than a public link, because they name people and show their numbers). Say so if you want a public link option.
- ID proofs are stored as an encrypted number only. Uploading document scans (offer letters, ID images) is not built.
- Two-factor sign-in (authenticator app) and Google sign-in are not built yet. They are the next security step, especially for founder accounts that can reveal bank details.
- Daily database backups are not done by the app. Turn them on in your hosting panel (Hostinger offers backups), and back up `FIELD_ENCRYPTION_KEY` separately.

## Look and feel, and motivation features

The interface uses a bold, large, rounded design system (see `src/app/globals.css`): bigger type, glass header, gradient accents, and light and dark themes that follow the device. It is responsive down to phones, with a floating bottom bar that scrolls sideways.

Features meant to make people want to fill things in, all computed from existing data (no extra database tables):

- **My Day** opens with a greeting, a daily progress ring, a **Focus now** card for the most important task, and a one-tap check button on every task. Completing a task fires confetti and a toast showing the points just earned.
- **Stand-up streak:** consecutive working days (Mon to Sat; Sundays never break it) with a daily update. The nudge card appears until today's update is in, and warns when a streak is at risk.
- **Levels:** lifetime points become levels (Rookie, Explorer, Achiever, Pro, Champion, Star, Legend, Icon). Level n starts at 30 x (n-1)^2 points. The sidebar shows progress to the next level.
- **Scores** shows a podium for the top three. Empty states are written to encourage, not to scold.
- Animations are skipped for people who ask their device for reduced motion.

### Challenges, badges and kudos (no database change)

**Challenges** (in the menu for everyone) gathers the team-building features:

- **Team challenge:** this week's company-wide task count against a goal, with the week's MVPs. The goal adapts to the last 4 weeks (a little above the average, never below 10). Founders can set their own number or go back to automatic.
- **Weekly goal:** each person gets a goal that stretches them slightly beyond their recent weeks (min 3, max 25) and can set their own (1 to 50) or return to automatic. Reaching it triggers a celebration once per week on that device.
- **Department race:** average points per person this week, so small and large teams compete fairly.
- **Streak board:** the longest current stand-up streaks. **Last week's stars:** top employee and intern.
- **Badges:** 18 achievements (task milestones, stand-up streaks, on-time runs, early finishes, complex work, accepted initiative, a perfect week, field check-ins, a converted referral, raising blockers early, giving and receiving kudos). They are computed from existing data each time, so nothing is stored and they can never drift. New badges are celebrated when you next open the app on a device.
- **Kudos:** give a colleague a short public thank-you (3 to 140 characters, max 10 a day). They get an in-app notification (never an email) and it appears on the wall. It is recorded in the audit log, which also feeds the Team Player badge.

Goals are stored in the `ScoreSetting` table under `goal.*` keys. The scoring screens only read and reset the real scoring weights, so changing or resetting scoring never touches goals.

## Phase 4: how it works

### Upgrading an existing database (do this BEFORE redeploying)

Phase 4 only **adds** 12 tables; nothing existing is changed.

1. In hPanel open **phpMyAdmin**, select your database, go to the **SQL** tab.
2. Paste the whole of `prisma/phase4-upgrade.sql` and click **Go**. (A fresh install uses `prisma/mysql-init.sql`, which already includes everything.)
3. Redeploy the app. Open `/api/health`: `phase4Schema` must say `true`. If it says `false` the SQL was not run; the older features keep working meanwhile and only the new pages show an error.

### Two-step sign-in (authenticator app)

- Anyone can turn it on at **Settings → Security** (founders see a reminder banner until they do). Scan the QR code with Google Authenticator, Microsoft Authenticator or Authy, type the 6-digit code to prove it works, and save the **8 recovery codes** shown once.
- After that, signing in asks for the code after the password. Revealing bank details or opening an ID document also asks for the code.
- A code works once (replay is blocked) and 5 wrong codes lock code entry for 10 minutes.
- Lost phone: use a recovery code, or another founder opens **People → the person → Reset two-step sign-in**.
- **Emergency (every founder locked out):** in the Hostinger panel add the environment variable `RESET_2FA_EMAILS=you@robokalam.com` (comma-separated for several), restart the app, sign in with the password, then **delete the variable** and turn 2FA on again. Each reset is written to the audit log.

### Backups and restore

- Turn on **automatic backups in Hostinger** (hPanel → Files / Databases → Backups) and keep at least 7 days.
- Founders can download the whole company data as JSON at `/api/admin/export` (secrets, bank and ID data are never included). Everyone can download their own data at **Settings → Your data and privacy**.
- Monthly restore drill (10 minutes): in phpMyAdmin **Export** the database, create a scratch database, **Import** the file there, and check that `User` and `Task` have rows. Delete the scratch database. If the drill fails, fix it before you need it.
- Keep `FIELD_ENCRYPTION_KEY` somewhere safe outside the server. Without it, bank details and ID documents in any backup cannot be read.

### ID documents

Founder-only, on **People → person → Bank & ID**. Files (PDF/image/Office, up to 8 MB) are **encrypted before they are stored**; opening one asks for your password (and 2FA code) again, and every open is audited.

### Time savers

- **Nudge** on the Founder's Desk sends one friendly message about overdue/blocked work, at most once a day per person. Managers can nudge their own team only.
- **Templates** (`/templates`, leads only): save the title, priority, complexity, estimate and checklist of work you repeat. Everyone can start a task from one on **New task**.
- **Bulk actions** on **List** (leads only): tick tasks, then change priority, status, assignee or due date in one go. Tasks that can't change are reported, not skipped silently.
- **Calendar link** (Settings): a private link that shows your tasks in Google/Apple/Outlook calendar. **Reset link** invalidates the old one.
- **WhatsApp replies:** staff reply `DONE a1b2c3`, `START`, `BLOCKED a1b2c3 reason`, `UPDATE text` or `TASKS`. In Meta's developer dashboard set the webhook to `https://YOUR-SITE/api/inbound/whatsapp`, with the verify token you chose, and add `WHATSAPP_APP_SECRET` (the app secret) and `WHATSAPP_VERIFY_TOKEN` to the environment. Only people who opted in can use it; tasks that need proof must be finished in the app. Replying **by email** is not built (it needs a mailbox the server can read).

### Robokalam-specific pages

- **Visits** (`/visits`): on the page of any task that has a location or is a recurring activity, fill the visit report (outcome, people reached, follow-up). Photos go in the Files box of the same task. Check-ins with location show a "See where they checked in" Google Maps link. A "Problem" report alerts founders.
- **Leads** (`/leads`): schools and contacts with stages New → Contacted → Demo → Proposal → Won/Lost, call log, follow-up reminders, and pipeline value. Employees see their own, managers their team's, founders everyone's.
- **Expenses** (`/expenses`): claim with an optional receipt photo; **founders** approve/reject and mark paid (a founder can't approve their own claim when there is another founder). **Download CSV** gives your accountant the lot.
- **Leave and attendance** (`/leave`): request leave naming a cover person; the reporting manager (or a founder) approves. On approval the cover person can be added to the open tasks due during the leave, and **new tasks for someone on leave also go to their cover**. The Desk shows "Away until". **I'm in / I'm out** on My Day stamps the time on the server.

### More fun

- **Weekly recap** card on My Day (Mon–Wed): last week's points, tasks, on-time %, stand-ups and kudos received.
- **Team celebrations** on My Day and the Desk, with confetti once a day: birthdays (people add their own day and month in Settings, optional), work anniversaries from the joining date, and internships ending within 7 days.
- **Seasonal challenges** on the Challenges page: founders launch a goal for a date range (tasks completed, points, stand-ups or kudos) with a prize; everyone sees the team progress bar and top three contributors.

### Phase 4 assumptions to confirm

- Leave days are counted as calendar days (no Sunday or holiday calendar yet); there is no leave balance.
- Expense approval is founders-only; receipts are stored on the server disk, not encrypted (IDs are).
- Birthdays are stored without a year and only if the person adds them.

## Phase 5: organisations (Robokalam, Samaritan Stand-Up, Calvings, Nextpreneur …)

One KalamDesk can now run several organisations side by side. Each has its **own** people, departments, tasks, scores, leads, expenses, leave, incentives and dashboards, and **nobody in one organisation can see or touch another's data**. The founder who owns the group (a **group owner**) can switch between them from the top of the sidebar; everyone else is pinned to their own organisation and only ever sees that one.

### Upgrading an existing database (do this BEFORE redeploying)

This one **changes existing tables** (it adds an `orgId` column to 17 of them), so back up first (hPanel → Databases → phpMyAdmin → Export).

1. In phpMyAdmin, select your database → **SQL** tab. If you have not yet run `prisma/phase4-upgrade.sql`, run that first.
2. Paste the whole of `prisma/phase5-orgs-upgrade.sql` and click **Go**. Run it **once**. Everything that exists today becomes part of an organisation called **Robokalam**, and every current founder becomes a group owner.
3. Redeploy the app. Open `/api/health`: `orgSchema` must say `true`. (Old code keeps working after the SQL, so the order is safe; new code does **not** work before it.)
4. Sign in, open **Organisations** in the sidebar, and create **Samaritan Stand-Up**, **Calvings** and **Nextpreneur**. Enter each organisation's first founder (name and email): they get an invite email and will only ever see their own organisation.

A fresh install uses `prisma/mysql-init.sql` (already includes this). `BOOTSTRAP_ORG_NAME` (optional) names the first organisation created by the first-founder bootstrap (default `Robokalam`).

### How the separation works

- Every top-level table carries an `orgId`. One central filter (`src/lib/tenancy.ts` + `src/lib/db.ts`) adds `orgId = <your organisation>` to **every** database read and write for a signed-in person, and stamps it on everything they create. A page or API that forgets to filter still cannot leak, because the filter is not in the page.
- Ids that arrive from the browser (an assignee, a department, a manager) are checked inside that filter, so pointing at another organisation's id is refused.
- Group owners are the one exception that is visible across organisations (as the founder). Other founders cannot edit or remove them.
- Each organisation has its own accent colour (set on the Organisations page); the whole app repaints in it.
- Scheduled emails (digests, weekly summaries, incentives, recurring tasks) run **once per organisation**, each inside its own filter, and the email names the organisation.
- People sign in with one email and one password; an email address can belong to only one organisation. A group owner who also works for another organisation should use their own email for the home organisation and switch.
- Not separated on purpose: the scoring rules (`ScoreSetting`) are shared by all organisations, and `Notification` rows belong to a person, not an organisation.

### Phase 5 assumptions to confirm

- An email address belongs to exactly one organisation (no one has two logins with the same email).
- Archiving an organisation hides it from the switcher, stops its scheduled emails and signs its people out (they see "archived" at sign-in); nothing is deleted and a group owner can restore it from the Organisations page.
- Office choices now include "Remote" and "Other" besides Hyderabad and Warangal.

## Phone app (installable, no app store)

KalamDesk is an installable web app (PWA). Nothing to configure and no database change.

- **Install:** Android (Chrome/Edge) shows an **Install app** button in the header and on **Settings**; iPhone/iPad (Safari) shows the "Share → Add to Home Screen" steps. Laptops can install from the address bar. The app then opens full screen from the home screen.
- **Phone layout:** a bottom bar with three shortcuts (My Day, Stand-up, Board; managers get Desk), a large **+** to add a task, and **More**, a sheet with every other page, the organisation switcher, level, Settings and Sign out. Content respects the notch and home bar.
- **Shortcuts:** long-press the icon on Android for *Add a task*, *My Day* and *Daily update* (`/my-day?new=1` opens the quick-add box).
- **Unread badge:** the home-screen icon shows the number of unread notifications where the phone supports it.
- **Offline:** an offline banner appears when the connection drops, and a friendly page replaces the browser error. The service worker (`public/sw.js`) caches only static files and icons. It never caches pages or API responses, so private work data is never stored on the device by the app.
- Installing needs the site to be served over **HTTPS** (Hostinger does this) and works in production only (the service worker is not registered in `next dev`).
- Icons are in `public/icons/`; the manifest is `public/manifest.webmanifest`.
- Not included yet: offline editing.

### Lock-screen notifications (Web Push)

- **Who gets them:** only people who turn them on, from **Settings → Lock-screen notifications** (or the *Never miss a task* card on My Day), on each phone or browser separately. They receive the same events as the bell (new task, blocked, sent back, reminders, kudos ...) except long digests. Tapping one opens KalamDesk on that task.
- **Upgrade (do this BEFORE redeploying):** in phpMyAdmin → SQL tab, run `prisma/phase6-push-upgrade.sql` once. It adds two new tables (`PushSubscription`, `PushConfig`) and changes nothing else. `/api/health` then shows `pushSchema: true`. Until then everything else keeps working and the Settings card says it is not switched on.
- **Keys:** nothing to set up. The server creates its own key pair on first use and stores it in the database (the private half encrypted with `FIELD_ENCRYPTION_KEY`). Optionally set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to use your own (make them with `npx web-push generate-vapid-keys`); keep the private one secret. Do not change keys later: every phone would have to turn alerts on again.
- **Delivery:** through the phone's own push service (Google for Android/Chrome, Apple for iPhone, Microsoft for Edge). The message carries only the title, a short line and a link.
- **Safety:** a device may only register an address on a known push service (https, Google / Apple / Microsoft / Mozilla); anything else is refused. Devices that uninstall or block notifications are removed automatically. A failure to send never blocks the action that triggered it.
- **iPhone / iPad:** Apple only allows web notifications for apps added to the Home Screen (iOS 16.4+). The card explains this.
- **Privacy:** the alert shows the task title on the lock screen. People can turn it off any time, in KalamDesk or in the phone's settings.

## Phase 7: files that stay, and session / workshop reports

- **Upgrade (BEFORE redeploying):** in phpMyAdmin → SQL tab, run `prisma/phase7-files-reports-upgrade.sql` once. It adds a table (`FileBlob`) and four columns on the visit report; nothing is removed. `/api/health` then shows `filesInDatabase: true`.
- **Why:** on shared hosting the app folder is replaced on every redeploy, which deleted files saved to disk (attachments looked uploaded but would not open). Files now go into the database, which is backed up and untouched by redeploys. **Files that were saved to disk before this change and have since been wiped cannot be recovered: ask people to attach them again.**
- **Viewing:** on a task, photos show as thumbnails; **View** opens a photo or PDF in the browser, **Download** saves it. Expense receipts open the same way (**view receipt**).
- **Reports for visits, training sessions and workshops:** every task now offers **+ Add a visit, session or workshop report**. It records the kind (guessed from the title), **topics covered**, **students attended**, teachers present, class or grade, how it went, and follow-up. The **Visits** page lists them with this-week totals (reports, sessions and workshops, students reached).
- Database size: photos are stored in the database, so it grows with uploads (10 MB per file at most). Check your Hostinger database quota occasionally.
