import { db } from "./db";
import { leaderboard, previousRange } from "./metrics";
import { istDateKey } from "./time";

export type Recap = { label: string; points: number; completed: number; onTimePct: number | null; standups: number; kudosReceived: number; rank: number | null; of: number };

/** Last week in numbers for one person. Null when the week was empty (nothing to celebrate or to nag about). */
export async function weeklyRecap(userId: string, role: string): Promise<Recap | null> {
  const range = previousRange("weekly");
  const group = role === "INTERN" ? "INTERN" : "EMPLOYEE";
  const rows = role === "FOUNDER" ? [] : await leaderboard(range, group);
  const i = rows.findIndex((r) => r.userId === userId);
  const me = i >= 0 ? rows[i] : null;
  const [standups, kudosReceived] = await Promise.all([
    db.dailyUpdate.count({ where: { userId, forDate: { gte: istDateKey(range.from), lte: istDateKey(new Date(range.to.getTime() - 1)) } } }),
    db.auditLog.count({ where: { action: "KUDOS_SENT", target: userId, createdAt: { gte: range.from, lt: range.to } } }),
  ]);
  if (!me && standups === 0 && kudosReceived === 0) return null;
  if (me && me.points === 0 && me.completed === 0 && standups === 0 && kudosReceived === 0) return null;
  return { label: range.label, points: me?.points ?? 0, completed: me?.completed ?? 0, onTimePct: me?.onTimePct ?? null, standups, kudosReceived, rank: me && me.points > 0 ? i + 1 : null, of: rows.length };
}
