# Changelog

## 2.0.0 (29 October 2026)

New since the first user guide. See `docs/KalamDesk-Whats-New-v2.pdf` for a screen-by-screen walkthrough.

**Added**
- **Installable phone app** (PWA): manifest, icons, service worker, Install button (Android / laptop), iPhone steps, bottom tab bar with a More sheet, offline page and banner, unread-count badge, home-screen shortcuts.
- **Lock-screen notifications** (Web Push): opt-in per device, self-generated keys stored encrypted, Settings card, My Day prompt, test button. New tables `PushSubscription`, `PushConfig` (`prisma/phase6-push-upgrade.sql`).
- **Files you can open**: photos and PDFs open in the browser, thumbnails, View / Download. Uploads are stored in the database (`FileBlob`) so they survive redeploys, and are checked against their real content.
- **Visit, training-session and workshop reports**: kind, topics covered, students attended, teachers present, class or grade; every task can have a report; Visits page totals (`prisma/phase7-files-reports-upgrade.sql`).
- **Storage limit with approval**: warns at 80%, asks a group owner to approve a clean-up at 90%, oldest data first, never touches people, tasks, scores, leave, leads, expense claims and receipts, ID documents or open tasks. Optional Auto-rotate. No database change.

**Changed**
- Employees and interns see a names-only People directory and no person / department filters.
- Shorter My Day banner on phones; the New task button lives in the bottom bar on phones.

**Upgrade order:** run `prisma/phase6-push-upgrade.sql`, then `prisma/phase7-files-reports-upgrade.sql` in phpMyAdmin, then redeploy. `/api/health` should show `pushSchema: true` and `filesInDatabase: true`.

## 1.0.0

Tasks, boards, recurring work, stand-ups, scoring and leaderboards, incentives, referrals, encrypted bank details, notifications (email and WhatsApp), two-step sign-in, leave and attendance, leads, expenses, visits, templates, challenges and celebrations, several organisations with strict separation, and the premium redesign. Guide: `docs/KalamDesk-User-Guide.pdf`.
