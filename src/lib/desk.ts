import { db } from "./db";
import { endOfIstDay, istDateKey, toIstParts, startOfIstDay } from "./time";
import { teamIds } from "./tasks";
import { awayOn } from "./leave";
import type { SessionUser } from "./auth";

export type Health = "RED" | "AMBER" | "GREEN";

export type PersonSummary = {
  id: string;
  name: string;
  role: string;
  department: string | null;
  office: string;
  photoUrl: string | null;
  today: { id: string; title: string; priority: string; status: string }[];
  overdue: number;
  blocked: number;
  openCount: number;
  lastUpdate: Date | null;
  updatedToday: boolean;
  health: Health;
  awayUntil: string | null;
};

/**
 * One batched query set for the whole desk (3 queries total, not per person) so the
 * Founder's Desk stays well under 2s with dozens of people.
 */
export async function deskSummaries(viewer: SessionUser): Promise<PersonSummary[]> {
  const now = new Date();
  const dayEnd = endOfIstDay(now);
  const scope = viewer.role === "MANAGER" ? [viewer.id, ...(await teamIds(viewer.id))] : null;

  const users = await db.user.findMany({
    where: { active: true, ...(scope ? { id: { in: scope } } : {}) },
    include: { department: true, profile: true },
    orderBy: { name: "asc" },
  });
  const ids = users.map((u) => u.id);

  const open = await db.taskAssignee.findMany({
    where: { userId: { in: ids }, task: { status: { notIn: ["DONE", "CANCELLED"] } } },
    select: { userId: true, task: { select: { id: true, title: true, priority: true, status: true, dueAt: true } } },
  });
  const acts = await db.taskActivity.groupBy({
    by: ["actorId"],
    where: { actorId: { in: ids } },
    _max: { createdAt: true },
  });
  const lastBy = new Map(acts.map((a) => [a.actorId, a._max.createdAt]));
  const updated = new Set((await db.dailyUpdate.findMany({ where: { userId: { in: ids }, forDate: istDateKey(now) }, select: { userId: true } })).map((x) => x.userId));
  const away = await awayOn(ids, istDateKey(now)).catch(() => new Map<string, { backupUserId: string | null; toDate: string }>());
  const afterSix = toIstParts(now).h >= 18;

  return users.map((u) => {
    const mine = open.filter((o) => o.userId === u.id).map((o) => o.task);
    const overdueTasks = mine.filter((t) => t.dueAt && t.dueAt < now);
    const blocked = mine.filter((t) => t.status === "BLOCKED").length;
    const today = mine
      .filter((t) => t.dueAt && t.dueAt <= dayEnd)
      .sort((a, b) => a.priority.localeCompare(b.priority))
      .map(({ id, title, priority, status }) => ({ id, title, priority, status }));
    const lastUpdate = lastBy.get(u.id) ?? null;
    const stale = mine.length > 0 && (!lastUpdate || now.getTime() - lastUpdate.getTime() > 24 * 3600 * 1000);

    let health: Health = "GREEN";
    if (overdueTasks.length >= 2 || overdueTasks.some((t) => t.priority === "P1")) health = "RED";
    else if (overdueTasks.length === 1 || blocked > 0 || stale || (afterSix && !updated.has(u.id))) health = "AMBER";

    return {
      id: u.id,
      name: u.name,
      role: u.role,
      department: u.department?.name ?? null,
      office: u.profile?.office ?? "",
      photoUrl: u.profile?.photoUrl ?? null,
      today,
      overdue: overdueTasks.length,
      blocked,
      openCount: mine.length,
      lastUpdate,
      updatedToday: updated.has(u.id),
      health,
      awayUntil: away.get(u.id)?.toDate ?? null,
    };
  });
}

export { startOfIstDay };
