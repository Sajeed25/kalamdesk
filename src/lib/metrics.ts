import { db } from "./db";
import { fromIst, toIstParts } from "./time";
import { teamIds } from "./tasks";
import type { SessionUser } from "./auth";

export type Period = "week" | "month" | "all";
export type Range = { from: Date; to: Date; label: string };

const DAY = 864e5;

/** Current IST week (Mon-Sun), month, or all time. */
export function currentRange(period: Period, now = new Date()): Range {
  const p = toIstParts(now);
  if (period === "week") {
    const monday = fromIst(p.y, p.m, p.d - ((p.dow + 6) % 7));
    return { from: monday, to: new Date(monday.getTime() + 7 * DAY), label: "This week" };
  }
  if (period === "month") return { from: fromIst(p.y, p.m, 1), to: fromIst(p.y, p.m + 1, 1), label: "This month" };
  // Bounds a real database can store (MySQL DATETIME is limited to years 1000-9999).
  return { from: new Date("2000-01-01T00:00:00Z"), to: new Date("2100-01-01T00:00:00Z"), label: "All time" };
}

/** The last completed week or month (used by the Monday / 1st summary emails). */
export function previousRange(kind: "weekly" | "monthly", now = new Date()): Range {
  const cur = currentRange(kind === "weekly" ? "week" : "month", now);
  if (kind === "weekly") return { from: new Date(cur.from.getTime() - 7 * DAY), to: cur.from, label: "Last week" };
  const p = toIstParts(cur.from);
  return { from: fromIst(p.y, p.m - 1, 1), to: cur.from, label: "Last month" };
}

export function parsePeriod(v: string | undefined): Period {
  return v === "month" || v === "all" ? v : "week";
}

export type PersonMetrics = {
  userId: string;
  assigned: number;
  completed: number;
  onTimePct: number | null;
  p12Rate: number | null; // P1/P2 completed / P1/P2 assigned
  avgComplexity: number | null;
  blockers: number;
  recurringPct: number | null;
  recurringMissed: number;
  points: number;
};

const pct = (n: number, d: number) => (d === 0 ? null : Math.round((n / d) * 100));

/**
 * Metrics for a set of people over a range. A task belongs to the range by its due date
 * (or creation date when it has none), so "assigned" and "completed" describe the same set of tasks.
 */
export async function personMetrics(userIds: string[], range: Range): Promise<Map<string, PersonMetrics>> {
  const inRange = { gte: range.from, lt: range.to };
  const [assignments, blockedActs, instances, points] = await Promise.all([
    db.taskAssignee.findMany({
      where: {
        userId: { in: userIds },
        task: { status: { not: "CANCELLED" }, OR: [{ dueAt: inRange }, { dueAt: null, createdAt: inRange }] },
      },
      select: { userId: true, task: { select: { priority: true, complexity: true, status: true, dueAt: true, completedAt: true } } },
    }),
    db.taskActivity.groupBy({
      by: ["actorId"],
      where: { actorId: { in: userIds }, action: "STATUS", detail: { contains: "→ Blocked" }, createdAt: inRange },
      _count: { _all: true },
    }),
    db.taskInstance.findMany({
      where: { forDate: inRange, task: { assignees: { some: { userId: { in: userIds } } } } },
      select: { outcome: true, task: { select: { assignees: { select: { userId: true } } } } },
    }),
    db.scoreEvent.groupBy({ by: ["userId"], where: { userId: { in: userIds }, createdAt: inRange }, _sum: { points: true } }),
  ]);

  const out = new Map<string, PersonMetrics>();
  for (const id of userIds)
    out.set(id, { userId: id, assigned: 0, completed: 0, onTimePct: null, p12Rate: null, avgComplexity: null, blockers: 0, recurringPct: null, recurringMissed: 0, points: 0 });

  const acc = new Map<string, { onTime: number; p12A: number; p12C: number; cx: number }>();
  for (const a of assignments) {
    const m = out.get(a.userId)!;
    const x = acc.get(a.userId) ?? { onTime: 0, p12A: 0, p12C: 0, cx: 0 };
    const done = a.task.status === "DONE";
    m.assigned++;
    x.cx += a.task.complexity;
    if (a.task.priority === "P1" || a.task.priority === "P2") x.p12A++;
    if (done) {
      m.completed++;
      if (!a.task.dueAt || (a.task.completedAt && a.task.completedAt <= a.task.dueAt)) x.onTime++;
      if (a.task.priority === "P1" || a.task.priority === "P2") x.p12C++;
    }
    acc.set(a.userId, x);
  }
  for (const [id, x] of acc) {
    const m = out.get(id)!;
    m.onTimePct = pct(x.onTime, m.completed);
    m.p12Rate = pct(x.p12C, x.p12A);
    m.avgComplexity = m.assigned ? Math.round((x.cx / m.assigned) * 10) / 10 : null;
  }
  for (const b of blockedActs) out.get(b.actorId)!.blockers = b._count._all;
  for (const p of points) out.get(p.userId)!.points = Math.round((p._sum.points ?? 0) * 10) / 10;

  // Recurring compliance: (on time + late) / (on time + late + missed). Pending ones are not counted yet.
  const rec = new Map<string, { ok: number; missed: number }>();
  for (const inst of instances) {
    if (inst.outcome === "PENDING") continue;
    for (const a of inst.task.assignees) {
      if (!out.has(a.userId)) continue;
      const r = rec.get(a.userId) ?? { ok: 0, missed: 0 };
      if (inst.outcome === "MISSED") r.missed++;
      else r.ok++;
      rec.set(a.userId, r);
    }
  }
  for (const [id, r] of rec) {
    const m = out.get(id)!;
    m.recurringPct = pct(r.ok, r.ok + r.missed);
    m.recurringMissed = r.missed;
  }
  return out;
}

export type LeaderRow = PersonMetrics & { name: string; role: string; department: string | null; recent: string[] };

/** People a viewer may see full metrics for: founder all, manager team + self, others only self. */
export async function inspectableIds(u: SessionUser): Promise<Set<string> | "all"> {
  if (u.role === "FOUNDER") return "all";
  if (u.role === "MANAGER") return new Set([u.id, ...(await teamIds(u.id))]);
  return new Set([u.id]);
}

export async function leaderboard(range: Range, group: "EMPLOYEE" | "INTERN", departmentId?: string): Promise<LeaderRow[]> {
  const users = await db.user.findMany({
    where: { active: true, role: group === "INTERN" ? "INTERN" : { in: ["EMPLOYEE", "MANAGER"] }, ...(departmentId ? { departmentId } : {}) },
    include: { department: true },
  });
  const ids = users.map((u) => u.id);
  const [metrics, events] = await Promise.all([
    personMetrics(ids, range),
    db.scoreEvent.findMany({ where: { userId: { in: ids }, createdAt: { gte: range.from, lt: range.to } }, orderBy: { createdAt: "desc" }, take: 600 }),
  ]);
  const rows = users.map((u) => ({
    ...metrics.get(u.id)!,
    name: u.name, role: u.role, department: u.department?.name ?? null,
    recent: events.filter((e) => e.userId === u.id).slice(0, 6).map((e) => `${e.points > 0 ? "+" : ""}${e.points}: ${e.breakdown}`),
  }));
  return rows.sort((a, b) => b.points - a.points || (b.onTimePct ?? -1) - (a.onTimePct ?? -1) || a.name.localeCompare(b.name));
}
