import { db } from "./db";
import { currentRange, leaderboard, type Period } from "./metrics";
import { teamIds } from "./tasks";
import { istDateKey, toIstParts } from "./time";
import type { SessionUser } from "./auth";

export type DashboardData = {
  label: string;
  kpis: { assigned: number; completed: number; onTimePct: number | null; overdueNow: number; blockedNow: number };
  trend: { day: string; completed: number; created: number }[];
  workload: { name: string; onTrack: number; overdue: number }[];
  ageing: { bucket: string; count: number }[];
  departments: { name: string; assigned: number; completed: number }[];
  top: { name: string; points: number; completed: number; onTimePct: number | null }[];
};

const DAY = 864e5;

export async function dashboardData(u: SessionUser, period: Exclude<Period, "all">): Promise<DashboardData> {
  const range = currentRange(period);
  const now = new Date();
  const scope = u.role === "FOUNDER" ? null : [u.id, ...(await teamIds(u.id))];
  const mine = scope ? { assignees: { some: { userId: { in: scope } } } } : {};
  const inRange = { gte: range.from, lt: range.to };

  const [tasks, completedIn, createdIn, openNow, top] = await Promise.all([
    db.task.findMany({
      where: { ...mine, status: { not: "CANCELLED" }, OR: [{ dueAt: inRange }, { dueAt: null, createdAt: inRange }] },
      select: { status: true, dueAt: true, completedAt: true, department: { select: { name: true } } },
    }),
    db.task.findMany({ where: { ...mine, completedAt: inRange }, select: { completedAt: true } }),
    db.task.findMany({ where: { ...mine, createdAt: inRange }, select: { createdAt: true } }),
    db.task.findMany({
      where: { ...mine, status: { notIn: ["DONE", "CANCELLED"] } },
      select: { status: true, dueAt: true, assignees: { select: { user: { select: { id: true, name: true } } } } },
    }),
    Promise.all([leaderboard(range, "EMPLOYEE"), leaderboard(range, "INTERN")]),
  ]);

  const done = tasks.filter((t) => t.status === "DONE");
  const onTime = done.filter((t) => !t.dueAt || (t.completedAt && t.completedAt <= t.dueAt)).length;
  const overdue = openNow.filter((t) => t.dueAt && t.dueAt < now);

  // trend: one point per IST day, up to today
  const days: { key: string; start: Date }[] = [];
  for (let d = range.from; d < range.to && d <= now; d = new Date(d.getTime() + DAY)) days.push({ key: istDateKey(d), start: d });
  const countBy = (list: (Date | null)[]) => {
    const m = new Map<string, number>();
    for (const x of list) if (x) m.set(istDateKey(x), (m.get(istDateKey(x)) ?? 0) + 1);
    return m;
  };
  const doneBy = countBy(completedIn.map((t) => t.completedAt));
  const madeBy = countBy(createdIn.map((t) => t.createdAt));
  const trend = days.map(({ key, start }) => {
    const p = toIstParts(start);
    return { day: `${p.d}/${p.m + 1}`, completed: doneBy.get(key) ?? 0, created: madeBy.get(key) ?? 0 };
  });

  // workload per person (only people in scope)
  const load = new Map<string, { name: string; onTrack: number; overdue: number }>();
  for (const t of openNow)
    for (const a of t.assignees) {
      if (scope && !scope.includes(a.user.id)) continue;
      const row = load.get(a.user.id) ?? { name: a.user.name, onTrack: 0, overdue: 0 };
      if (t.dueAt && t.dueAt < now) row.overdue++;
      else row.onTrack++;
      load.set(a.user.id, row);
    }
  const workload = [...load.values()].sort((a, b) => b.onTrack + b.overdue - (a.onTrack + a.overdue)).slice(0, 15);

  const age = (t: { dueAt: Date | null }) => Math.floor((now.getTime() - t.dueAt!.getTime()) / DAY);
  const ageing = [
    { bucket: "1–2 days", count: overdue.filter((t) => age(t) <= 2).length },
    { bucket: "3–7 days", count: overdue.filter((t) => age(t) >= 3 && age(t) <= 7).length },
    { bucket: "8–14 days", count: overdue.filter((t) => age(t) >= 8 && age(t) <= 14).length },
    { bucket: "15+ days", count: overdue.filter((t) => age(t) >= 15).length },
  ];

  const dep = new Map<string, { name: string; assigned: number; completed: number }>();
  for (const t of tasks) {
    const name = t.department?.name ?? "No department";
    const r = dep.get(name) ?? { name, assigned: 0, completed: 0 };
    r.assigned++;
    if (t.status === "DONE") r.completed++;
    dep.set(name, r);
  }

  const inScope = (id: string) => !scope || scope.includes(id);
  const topRows = [...top[0], ...top[1]].filter((r) => inScope(r.userId)).sort((a, b) => b.points - a.points).slice(0, 5)
    .map((r) => ({ name: r.name, points: r.points, completed: r.completed, onTimePct: r.onTimePct }));

  return {
    label: range.label,
    kpis: {
      assigned: tasks.length, completed: done.length,
      onTimePct: done.length ? Math.round((onTime / done.length) * 100) : null,
      overdueNow: overdue.length, blockedNow: openNow.filter((t) => t.status === "BLOCKED").length,
    },
    trend, workload, ageing,
    departments: [...dep.values()].sort((a, b) => b.assigned - a.assigned),
    top: topRows,
  };
}
