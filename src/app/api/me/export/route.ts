import { authed } from "@/lib/api";
import { db } from "@/lib/db";

// "Download my data" (DPDP Act right of access): everything the app holds about the signed-in person.
// Bank and ID details are not included here; they are founder-held and encrypted. Ask a founder if you need them.
export const GET = authed(async (_req, u) => {
  const [user, profile, assigned, created, updates, scores, awards, referrals, kudosGiven, kudosGot, notifications] = await Promise.all([
    db.user.findUnique({ where: { id: u.id }, select: { id: true, name: true, email: true, role: true, createdAt: true, consentAt: true } }),
    db.employeeProfile.findUnique({ where: { userId: u.id } }),
    db.task.findMany({ where: { assignees: { some: { userId: u.id } } }, select: { id: true, title: true, status: true, priority: true, dueAt: true, completedAt: true, createdAt: true } }),
    db.task.findMany({ where: { creatorId: u.id }, select: { id: true, title: true, createdAt: true } }),
    db.dailyUpdate.findMany({ where: { userId: u.id } }),
    db.scoreEvent.findMany({ where: { userId: u.id } }),
    db.incentiveAward.findMany({ where: { userId: u.id } }),
    db.referral.findMany({ where: { referrerId: u.id } }),
    db.auditLog.findMany({ where: { actorId: u.id, action: "KUDOS_SENT" }, select: { target: true, meta: true, createdAt: true } }),
    db.notification.findMany({ where: { userId: u.id, kind: "KUDOS" }, select: { title: true, body: true, createdAt: true } }),
    db.notification.count({ where: { userId: u.id } }),
  ]);
  await db.auditLog.create({ data: { actorId: u.id, action: "EXPORT_MY_DATA", target: u.id } });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(
    JSON.stringify({ exportedAt: new Date().toISOString(), account: user, profile, tasksAssignedToMe: assigned, tasksIAssigned: created, dailyUpdates: updates, scoreEvents: scores, incentives: awards, referralsIMade: referrals, kudosIGave: kudosGiven, kudosIReceived: kudosGot, notificationCount: notifications }, null, 2),
    { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="my-kalamdesk-data-${date}.json"`, "Cache-Control": "private, no-store" } }
  );
});
