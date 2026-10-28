import { db } from "./db";
import { istDateKey, toIstParts } from "./time";

/**
 * Motivation helpers: levels from lifetime points, stand-up streaks, greetings.
 * Everything derives from data the app already has, so there is no extra table to maintain.
 */

// ---------- levels ----------
// Level n starts at 30 * (n-1)^2 points: L2 at 30, L3 at 120, L4 at 270, L5 at 480, L6 at 750 ...
const STEP = 30;
const NAMES = ["Rookie", "Explorer", "Achiever", "Pro", "Champion", "Star", "Legend", "Icon"];

export function levelFor(points: number) {
  const pts = Math.max(0, points);
  const level = 1 + Math.floor(Math.sqrt(pts / STEP));
  const floor = STEP * (level - 1) ** 2;
  const next = STEP * level ** 2;
  return {
    level,
    name: NAMES[Math.min(level - 1, NAMES.length - 1)],
    points: Math.round(pts * 10) / 10,
    toNext: Math.max(0, Math.ceil(next - pts)),
    progress: Math.min(1, (pts - floor) / (next - floor)),
  };
}

export async function lifetimePoints(userId: string) {
  const s = await db.scoreEvent.aggregate({ where: { userId }, _sum: { points: true } });
  return s._sum.points ?? 0;
}

// ---------- stand-up streak ----------
const key = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * Consecutive working days (Mon to Sat; Sundays neither count nor break the streak) with a stand-up,
 * counted back from today. If today has no stand-up yet, the streak is still alive (counted from
 * yesterday) and flagged `atRisk`: it only breaks once a full working day is missed.
 */
export function streakFromKeys(keys: Set<string>, todayKey: string) {
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const doneToday = keys.has(todayKey);
  let count = 0;
  for (let i = doneToday ? 0 : 1; i < 400; i++) {
    const d = new Date(Date.UTC(ty, tm - 1, td - i));
    if (d.getUTCDay() === 0) continue; // Sunday
    if (keys.has(key(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))) count++;
    else break;
  }
  return { count, doneToday, atRisk: !doneToday && count > 0 };
}

export async function standupStreak(userId: string, now = new Date()) {
  const rows = await db.dailyUpdate.findMany({ where: { userId }, select: { forDate: true }, orderBy: { forDate: "desc" }, take: 420 });
  return streakFromKeys(new Set(rows.map((r) => r.forDate)), istDateKey(now));
}

// ---------- tone ----------
export function greeting(name: string, now = new Date()) {
  const h = toIstParts(now).h;
  const part = h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good night";
  return `${part}, ${name.split(" ")[0]}`;
}

const LINES = [
  "Small steps, done daily, beat big plans.",
  "Clear one thing now. Momentum does the rest.",
  "Your future self will thank you for this one.",
  "Start with the hardest task. The rest feels easy.",
  "Done is better than perfect. Ship it.",
  "Every finished task is a school we helped.",
  "Progress, not perfection. Keep going.",
];
/** Same line all day, a different one tomorrow. */
export function dailyLine(now = new Date()) {
  const p = toIstParts(now);
  return LINES[(p.y * 372 + p.m * 31 + p.d) % LINES.length];
}

