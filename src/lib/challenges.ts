import { z } from "zod";
import { db } from "./db";
import { dateKeySchema } from "./dates";
import { istDateKey } from "./time";

import { METRICS } from "./challengeMeta";

export { METRICS, METRIC_LABEL } from "./challengeMeta";

export const challengeSchema = z.object({
  title: z.string().trim().min(3, "Give it a catchy title").max(120),
  description: z.string().trim().max(500).optional().default(""),
  metric: z.enum(METRICS),
  target: z.number().int().min(1).max(1_000_000),
  startsOn: dateKeySchema,
  endsOn: dateKeySchema,
  prize: z.string().trim().max(200).optional().default(""),
}).refine((c) => c.endsOn >= c.startsOn, { message: "The end can't be before the start", path: ["endsOn"] })
  .refine((c) => Date.parse(c.endsOn) - Date.parse(c.startsOn) <= 120 * 864e5, { message: "Keep it under 4 months", path: ["endsOn"] });

export const bounds = (c: { startsOn: string; endsOn: string }) => ({ from: new Date(`${c.startsOn}T00:00:00+05:30`), to: new Date(`${c.endsOn}T23:59:59.999+05:30`) });

export function phase(c: { startsOn: string; endsOn: string }, today = istDateKey()): "UPCOMING" | "LIVE" | "ENDED" {
  return today < c.startsOn ? "UPCOMING" : today > c.endsOn ? "ENDED" : "LIVE";
}

/** Team total and the top contributors. Founders watch rather than play, so they are not counted. */
export async function challengeProgress(c: { metric: string; startsOn: string; endsOn: string }) {
  const { from, to } = bounds(c);
  const players = (await db.user.findMany({ where: { active: true, role: { not: "FOUNDER" } }, select: { id: true } })).map((p) => p.id);
  const per = new Map<string, number>();
  const add = (id: string | null, n: number) => { if (id && players.includes(id)) per.set(id, (per.get(id) ?? 0) + n); };
  if (c.metric === "TASKS_DONE") {
    for (const r of await db.taskAssignee.findMany({ where: { userId: { in: players }, task: { status: "DONE", completedAt: { gte: from, lte: to } } }, select: { userId: true } })) add(r.userId, 1);
  } else if (c.metric === "POINTS") {
    for (const r of await db.scoreEvent.groupBy({ by: ["userId"], where: { userId: { in: players }, createdAt: { gte: from, lte: to } }, _sum: { points: true } })) add(r.userId, Math.max(0, Math.round(r._sum.points ?? 0)));
  } else if (c.metric === "STANDUPS") {
    for (const r of await db.dailyUpdate.groupBy({ by: ["userId"], where: { userId: { in: players }, forDate: { gte: c.startsOn, lte: c.endsOn } }, _count: { _all: true } })) add(r.userId, r._count._all);
  } else {
    for (const r of await db.auditLog.groupBy({ by: ["actorId"], where: { action: "KUDOS_SENT", actorId: { in: players }, createdAt: { gte: from, lte: to } }, _count: { _all: true } })) add(r.actorId, r._count._all);
  }
  const top = [...per].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return { total: [...per.values()].reduce((s, n) => s + n, 0), top };
}
