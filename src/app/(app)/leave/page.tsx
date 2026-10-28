import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder, isLead } from "@/lib/rbac";
import { teamIds } from "@/lib/tasks";
import { istDateKey } from "@/lib/time";
import { LEAVE_LABEL } from "@/lib/leave";
import { AttendanceCard, LeaveActions, LeaveForm } from "@/components/LeaveParts";

export const dynamic = "force-dynamic";

const CLS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", CANCELLED: "bg-line text-mute",
};
const hm = (d: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(d);

export default async function Leave() {
  const u = await requireUser();
  const today = istDateKey();
  const scope = isFounder(u) ? null : isLead(u) ? await teamIds(u.id) : [];
  const [people, mine, att, pending, awayNow, inToday] = await Promise.all([
    db.user.findMany({ where: { active: true, id: { not: u.id } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.leaveRequest.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.attendanceLog.findUnique({ where: { userId_forDate: { userId: u.id, forDate: today } } }),
    isLead(u) ? db.leaveRequest.findMany({ where: { status: "PENDING", userId: scope ? { in: scope } : { not: u.id } }, orderBy: { fromDate: "asc" }, take: 50 }) : Promise.resolve([]),
    isLead(u) ? db.leaveRequest.findMany({ where: { status: "APPROVED", fromDate: { lte: today }, toDate: { gte: today }, ...(scope ? { userId: { in: scope } } : {}) } }) : Promise.resolve([]),
    isLead(u) ? db.attendanceLog.findMany({ where: { forDate: today, ...(scope ? { userId: { in: scope } } : {}) }, orderBy: { checkInAt: "asc" } }) : Promise.resolve([]),
  ]);
  const ids = [...mine.map((m) => m.backupUserId), ...pending.map((p) => p.userId), ...pending.map((p) => p.backupUserId), ...awayNow.map((a) => a.userId), ...awayNow.map((a) => a.backupUserId), ...inToday.map((a) => a.userId)].filter(Boolean) as string[];
  const names = new Map((await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div><div className="eyebrow">Time</div><h1 className="page-title mt-1">Leave and attendance</h1></div>
      <AttendanceCard checkIn={att?.checkInAt.toISOString() ?? null} checkOut={att?.checkOutAt?.toISOString() ?? null} />

      {isLead(u) && (
        <section className="space-y-3">
          <h2 className="eyebrow">Today</h2>
          <div className="panel p-4 text-sm">
            <div><b>Away:</b> {awayNow.length ? awayNow.map((a) => `${names.get(a.userId)}${a.backupUserId ? ` (cover: ${names.get(a.backupUserId)})` : ""}`).join(", ") : "nobody"}</div>
            <div className="mt-1"><b>Checked in:</b> {inToday.length ? inToday.map((a) => `${names.get(a.userId)} ${hm(a.checkInAt)}`).join(", ") : "nobody yet"}</div>
          </div>
          {pending.length > 0 && <h2 className="eyebrow pt-2">Waiting for your decision</h2>}
          {pending.map((l) => (
            <article key={l.id} className="panel p-4">
              <div className="font-extrabold">{names.get(l.userId)} <span className="font-semibold text-mute">· {LEAVE_LABEL[l.type]} · {l.fromDate}{l.fromDate !== l.toDate && ` to ${l.toDate}`} ({l.days} day{l.days > 1 ? "s" : ""})</span></div>
              {l.reason && <p className="mt-1 text-sm">{l.reason}</p>}
              {l.backupUserId && <p className="mt-1 text-sm font-semibold text-mute">Cover: {names.get(l.backupUserId)}</p>}
              <div className="mt-2"><LeaveActions id={l.id} canDecide canCancel={false} hasBackup={!!l.backupUserId} status={l.status} /></div>
            </article>
          ))}
        </section>
      )}

      <h2 className="eyebrow pt-2">Ask for leave</h2>
      <LeaveForm people={people} today={today} />
      <h2 className="eyebrow pt-2">My leave</h2>
      {mine.length === 0 && <div className="panel p-6 text-center text-sm font-semibold text-mute">No leave requests yet.</div>}
      {mine.map((l) => (
        <article key={l.id} className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-extrabold">{LEAVE_LABEL[l.type]} <span className="font-semibold text-mute">· {l.fromDate}{l.fromDate !== l.toDate && ` to ${l.toDate}`} ({l.days} day{l.days > 1 ? "s" : ""})</span></div>
            <span className={`chip ${CLS[l.status]}`}>{l.status.charAt(0) + l.status.slice(1).toLowerCase()}</span>
          </div>
          {l.backupUserId && <p className="mt-1 text-sm font-semibold text-mute">Cover: {names.get(l.backupUserId)}</p>}
          {l.decisionNote && <p className="mt-1 text-sm font-semibold text-mute">Note: {l.decisionNote}</p>}
          <div className="mt-2"><LeaveActions id={l.id} canDecide={false} canCancel={["PENDING", "APPROVED"].includes(l.status) && l.toDate >= today} hasBackup={false} status={l.status} /></div>
        </article>
      ))}
    </div>
  );
}
