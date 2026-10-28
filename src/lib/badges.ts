import { db } from "./db";
import { toIstParts } from "./time";

/**
 * Achievement badges. Nothing is stored: each badge is derived from the person's history every time,
 * so badges can never drift out of sync with the data (and need no extra database table).
 */
export type Tier = "bronze" | "silver" | "gold" | "special";
export type MetricKey = "done" | "bestStreak" | "onTimeRun" | "early" | "heavy" | "initiative" | "perfectWeeks" | "checkins" | "referrals" | "blockers" | "kudosSent" | "kudosGot";
export type Stats = Record<MetricKey, number>;

export type BadgeDef = { id: string; emoji: string; name: string; hint: string; tier: Tier; metric: MetricKey; need: number };

export const BADGES: BadgeDef[] = [
  { id: "first-step", emoji: "🌱", name: "First Step", hint: "Complete your first task", tier: "bronze", metric: "done", need: 1 },
  { id: "club-10", emoji: "🎯", name: "10 Club", hint: "Complete 10 tasks", tier: "bronze", metric: "done", need: 10 },
  { id: "club-50", emoji: "🏅", name: "50 Club", hint: "Complete 50 tasks", tier: "silver", metric: "done", need: 50 },
  { id: "century", emoji: "🏆", name: "Century", hint: "Complete 100 tasks", tier: "gold", metric: "done", need: 100 },
  { id: "spark", emoji: "🔥", name: "Spark", hint: "5-day stand-up streak", tier: "bronze", metric: "bestStreak", need: 5 },
  { id: "blaze", emoji: "☄️", name: "Blaze", hint: "10-day stand-up streak", tier: "silver", metric: "bestStreak", need: 10 },
  { id: "inferno", emoji: "🌋", name: "Inferno", hint: "20-day stand-up streak", tier: "gold", metric: "bestStreak", need: 20 },
  { id: "punctual", emoji: "⏰", name: "Punctual", hint: "10 tasks in a row done on time", tier: "silver", metric: "onTimeRun", need: 10 },
  { id: "clockwork", emoji: "🕰️", name: "Clockwork", hint: "25 tasks in a row done on time", tier: "gold", metric: "onTimeRun", need: 25 },
  { id: "early-bird", emoji: "🦅", name: "Early Bird", hint: "Finish 5 tasks a day or more before the deadline", tier: "silver", metric: "early", need: 5 },
  { id: "heavy-lifter", emoji: "💪", name: "Heavy Lifter", hint: "Complete 5 complex tasks (level 4 or 5)", tier: "silver", metric: "heavy", need: 5 },
  { id: "initiator", emoji: "🚀", name: "Initiator", hint: "3 self-started tasks accepted by a founder", tier: "silver", metric: "initiative", need: 3 },
  { id: "perfect-week", emoji: "✨", name: "Perfect Week", hint: "A week with 3+ tasks, all on time", tier: "gold", metric: "perfectWeeks", need: 1 },
  { id: "field-pro", emoji: "📍", name: "Field Pro", hint: "Check in at 5 field visits", tier: "silver", metric: "checkins", need: 5 },
  { id: "referral-star", emoji: "🎁", name: "Referral Star", hint: "Get a referral converted", tier: "special", metric: "referrals", need: 1 },
  { id: "speaks-up", emoji: "📣", name: "Speaks Up", hint: "Raise 3 blockers early", tier: "special", metric: "blockers", need: 3 },
  { id: "team-player", emoji: "🙌", name: "Team Player", hint: "Give kudos to 5 colleagues", tier: "special", metric: "kudosSent", need: 5 },
  { id: "loved", emoji: "💜", name: "Loved", hint: "Receive kudos 5 times", tier: "special", metric: "kudosGot", need: 5 },
];

export type BadgeStatus = BadgeDef & { have: number; earned: boolean };

export function evaluate(stats: Stats): BadgeStatus[] {
  return BADGES.map((b) => ({ ...b, have: Math.min(stats[b.metric], b.need), earned: stats[b.metric] >= b.need }));
}

// ---------------- pure helpers (unit tested) ----------------

/** Longest run of consecutive working days (Mon-Sat, Sundays skipped) with a stand-up, ever. */
export function bestStreakFromKeys(keys: Set<string>, todayKey: string): number {
  const sorted = [...keys].filter((k) => k <= todayKey).sort();
  if (sorted.length === 0) return 0;
  const [sy, sm, sd] = sorted[0].split("-").map(Number);
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const end = Date.UTC(ty, tm - 1, td);
  let run = 0;
  let best = 0;
  for (let t = Date.UTC(sy, sm - 1, sd); t <= end; t += 864e5) {
    const d = new Date(t);
    if (d.getUTCDay() === 0) continue; // Sunday neither counts nor breaks
    if (keys.has(d.toISOString().slice(0, 10))) best = Math.max(best, ++run);
    else run = 0;
  }
  return best;
}

export function longestTrueRun(flags: boolean[]): number {
  let run = 0;
  let best = 0;
  for (const f of flags) {
    run = f ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Number of IST weeks (Mon-Sun) in which the person finished at least 3 tasks and every one was on time. */
export function perfectWeeks(tasks: { completedAt: Date; onTime: boolean }[]): number {
  const weeks = new Map<string, { n: number; ok: boolean }>();
  for (const t of tasks) {
    const p = toIstParts(t.completedAt);
    const key = new Date(Date.UTC(p.y, p.m, p.d - ((p.dow + 6) % 7))).toISOString().slice(0, 10);
    const w = weeks.get(key) ?? { n: 0, ok: true };
    w.n++;
    w.ok = w.ok && t.onTime;
    weeks.set(key, w);
  }
  return [...weeks.values()].filter((w) => w.n >= 3 && w.ok).length;
}

// ---------------- data ----------------

export async function badgeStats(userId: string, todayKey: string): Promise<Stats> {
  const [done, updates, checkins, referrals, blockers, kudosSent, kudosGot] = await Promise.all([
    db.task.findMany({
      where: { status: "DONE", completedAt: { not: null }, assignees: { some: { userId } } },
      select: { completedAt: true, dueAt: true, complexity: true, selfInitiated: true, initiativeAccepted: true },
      orderBy: { completedAt: "asc" },
      take: 3000,
    }),
    db.dailyUpdate.findMany({ where: { userId }, select: { forDate: true } }),
    db.taskInstance.count({ where: { checkInAt: { not: null }, outcome: { in: ["DONE", "LATE"] }, task: { assignees: { some: { userId } } } } }),
    db.referral.count({ where: { referrerId: userId, status: { in: ["CONVERTED", "REWARD_PAID"] } } }),
    db.taskActivity.count({ where: { actorId: userId, action: "STATUS", detail: { contains: "→ Blocked" } } }),
    db.auditLog.count({ where: { actorId: userId, action: "KUDOS_SENT" } }),
    db.notification.count({ where: { userId, kind: "KUDOS" } }),
  ]);

  const flags = done.map((t) => !t.dueAt || t.completedAt! <= t.dueAt);
  return {
    done: done.length,
    bestStreak: bestStreakFromKeys(new Set(updates.map((u) => u.forDate)), todayKey),
    onTimeRun: longestTrueRun(flags),
    early: done.filter((t) => t.dueAt && t.dueAt.getTime() - t.completedAt!.getTime() >= 864e5).length,
    heavy: done.filter((t) => t.complexity >= 4).length,
    initiative: done.filter((t) => t.selfInitiated && t.initiativeAccepted).length,
    perfectWeeks: perfectWeeks(done.map((t, i) => ({ completedAt: t.completedAt!, onTime: flags[i] }))),
    checkins,
    referrals,
    blockers,
    kudosSent,
    kudosGot,
  };
}
