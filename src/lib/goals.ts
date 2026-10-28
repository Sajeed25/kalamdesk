import { db } from "./db";
import { currentRange } from "./metrics";

/**
 * Weekly goals. A person's goal adapts to how much they have actually been finishing (last 4 full weeks,
 * plus a small stretch), so it is challenging but fair. They can set their own; founders can set the team goal.
 * Stored in ScoreSetting under "goal.*" keys (the scoring-weight code ignores those keys).
 */
const DAY = 864e5;
export const PERSONAL_MIN = 1;
export const PERSONAL_MAX = 50;
export const TEAM_MIN = 5;
export const TEAM_MAX = 1000;
export const personalKey = (userId: string) => `goal.tasks:${userId}`;
export const TEAM_KEY = "goal.team.tasks";

/** Pure: weekly completion counts (oldest to newest) -> a stretch goal. */
export function adaptiveGoal(counts: number[], o: { floor: number; ceil: number; factor: number; fallback: number }) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (counts.length === 0 || total === 0) return o.fallback;
  const goal = Math.ceil((total / counts.length) * o.factor);
  return Math.max(o.floor, Math.min(o.ceil, goal));
}

/** Completed-task counts for each of the previous `weeks` full IST weeks, oldest first. */
export async function weeklyCounts(userId: string | null, weeks = 4): Promise<number[]> {
  const thisWeek = currentRange("week").from;
  const from = new Date(thisWeek.getTime() - weeks * 7 * DAY);
  const rows = await db.task.findMany({
    where: { status: "DONE", completedAt: { gte: from, lt: thisWeek }, ...(userId ? { assignees: { some: { userId } } } : {}) },
    select: { completedAt: true },
  });
  const counts = new Array(weeks).fill(0);
  for (const r of rows) counts[Math.min(weeks - 1, Math.floor((r.completedAt!.getTime() - from.getTime()) / (7 * DAY)))]++;
  return counts;
}

export type GoalView = { goal: number; custom: boolean; done: number; pct: number; daysLeft: number };

async function view(userId: string | null, override: number | null, opts: Parameters<typeof adaptiveGoal>[1]): Promise<GoalView> {
  const range = currentRange("week");
  const [counts, done] = await Promise.all([
    override === null ? weeklyCounts(userId) : Promise.resolve([]),
    db.task.count({ where: { status: "DONE", completedAt: { gte: range.from, lt: range.to }, ...(userId ? { assignees: { some: { userId } } } : {}) } }),
  ]);
  const goal = override ?? adaptiveGoal(counts, opts);
  return { goal, custom: override !== null, done, pct: Math.min(1, done / goal), daysLeft: Math.max(0, Math.ceil((range.to.getTime() - Date.now()) / DAY)) };
}

const getKey = async (key: string) => (await db.scoreSetting.findUnique({ where: { key } }))?.value ?? null;

export async function personalGoal(userId: string) {
  return view(userId, await getKey(personalKey(userId)), { floor: 3, ceil: 25, factor: 1.15, fallback: 5 });
}
export async function teamGoal() {
  return view(null, await getKey(TEAM_KEY), { floor: 10, ceil: 500, factor: 1.1, fallback: 15 });
}

/** value null removes the override (back to the adaptive goal). */
export async function setGoal(key: string, value: number | null) {
  if (value === null) await db.scoreSetting.deleteMany({ where: { key } });
  else await db.scoreSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
}
