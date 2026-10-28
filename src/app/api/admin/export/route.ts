import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";

// Company data export (a backup you can keep, and the "right to access" for the whole workspace).
// Deliberately EXCLUDES secrets: password hashes, 2FA secrets, recovery codes, reset tokens, and all bank/ID
// data (those stay only in the database, encrypted). Your hosting provider's database backup remains the
// real disaster-recovery copy; this export is a readable second copy of the working data.
export const GET = authed(async (_req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can export company data");

  const users = await db.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true, departmentId: true, consentAt: true, createdAt: true } });
  const data = {
    exportedAt: new Date().toISOString(),
    exportedBy: u.name,
    note: "Secrets, bank details and ID data are intentionally not included.",
    users,
    departments: await db.department.findMany(),
    profiles: await db.employeeProfile.findMany(),
    tasks: await db.task.findMany({ include: { assignees: { select: { userId: true } }, checklist: true, comments: true, activity: true, instances: true } }),
    recurringRules: await db.recurringRule.findMany(),
    dailyUpdates: await db.dailyUpdate.findMany(),
    scoreEvents: await db.scoreEvent.findMany(),
    scoreSettings: await db.scoreSetting.findMany(),
    incentiveRules: await db.incentiveRule.findMany(),
    incentiveAwards: await db.incentiveAward.findMany(),
    referralPrograms: await db.referralProgram.findMany(),
    referrals: await db.referral.findMany(),
    snapshots: await db.dashboardSnapshot.findMany({ select: { id: true, period: true, label: true, createdAt: true } }),
    auditLog: await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5000 }),
  };
  await db.auditLog.create({ data: { actorId: u.id, action: "EXPORT_COMPANY_DATA", target: "company", meta: `${data.tasks.length} tasks, ${users.length} people` } });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="kalamdesk-export-${date}.json"`, "Cache-Control": "private, no-store" },
  });
});
