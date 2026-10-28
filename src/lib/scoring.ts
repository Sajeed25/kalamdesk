import { db } from "./db";

/**
 * Scoring. Points per completed task =
 *   base(priority) x complexity multiplier x timeliness factor
 *   + founder impact bonus (stars x per-star points)       [separate IMPACT event]
 *   + initiative bonus for self-initiated work accepted by a founder  [separate INITIATIVE event]
 * Penalties: missed recurring instance, and open task overdue > N days without a Blocked reason.
 * Every weight is editable (ScoreSetting table, Settings > Scoring); missing keys fall back to DEFAULTS.
 * Each event stores a human-readable `breakdown` so the score is explainable on hover.
 */
export const DEFAULTS: Record<string, number> = {
  "base.P1": 10, "base.P2": 7, "base.P3": 5, "base.P4": 3,
  "cx.1": 1.0, "cx.2": 1.2, "cx.3": 1.5, "cx.4": 1.8, "cx.5": 2.2,
  "time.onTime": 1.0, "time.late24": 0.7, "time.lateMore": 0.4,
  "impact.perStar": 2,
  "initiative.bonus": 2,
  "penalty.missedRecurring": 3,
  "penalty.overdue": 2,
  "penalty.overdueDays": 3,
};

export type Settings = Record<string, number>;

export async function getSettings(): Promise<Settings> {
  const rows = await db.scoreSetting.findMany();
  return { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}

export async function saveSettings(values: Record<string, number>) {
  for (const [key, value] of Object.entries(values)) {
    if (!(key in DEFAULTS)) continue;
    await db.scoreSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}

export async function resetSettings() {
  await db.scoreSetting.deleteMany();
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

export function timeliness(dueAt: Date | null, completedAt: Date, s: Settings) {
  if (!dueAt || completedAt <= dueAt) return { factor: s["time.onTime"], label: dueAt ? "on time" : "no deadline" };
  const lateMs = completedAt.getTime() - dueAt.getTime();
  return lateMs <= 24 * 3600 * 1000
    ? { factor: s["time.late24"], label: "late (<24h)" }
    : { factor: s["time.lateMore"], label: "late (>24h)" };
}

export function taskPoints(t: { priority: string; complexity: number; dueAt: Date | null }, completedAt: Date, s: Settings) {
  const base = s[`base.${t.priority}`] ?? 0;
  const cx = s[`cx.${t.complexity}`] ?? 1;
  const tm = timeliness(t.dueAt, completedAt, s);
  const points = Math.round(base * cx * tm.factor * 100) / 100;
  return { points, breakdown: `${t.priority} base ${fmt(base)} x complexity ${t.complexity} (${fmt(cx)}) x ${tm.label} (${fmt(tm.factor)}) = ${fmt(points)}` };
}

/** Insert one event at most once per (kind, task, user): the JobRun row is the atomic guard. */
async function addOnce(kind: string, taskId: string, userId: string, points: number, breakdown: string, at: Date) {
  try {
    await db.jobRun.create({ data: { kind: `score-${kind}`, key: `${taskId}:${userId}` } });
  } catch {
    return false;
  }
  await db.scoreEvent.create({ data: { userId, taskId, kind, points, breakdown, createdAt: at } });
  return true;
}

/** Idempotent: make sure a DONE task has all the events it should. Safe to call repeatedly. */
export async function syncScore(taskId: string) {
  const t = await db.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
  if (!t || t.status !== "DONE") return;
  const s = await getSettings();
  const at = t.completedAt ?? new Date();
  const { points, breakdown } = taskPoints(t, at, s);
  for (const a of t.assignees) {
    await addOnce("TASK_DONE", t.id, a.userId, points, breakdown, at);
    if (t.reviewState === "APPROVED" && t.impactStars && t.impactStars > 0) {
      const p = t.impactStars * s["impact.perStar"];
      await addOnce("IMPACT", t.id, a.userId, p, `Founder impact rating ${t.impactStars}/5 x ${fmt(s["impact.perStar"])} = ${fmt(p)}`, at);
    }
    if (t.selfInitiated && t.initiativeAccepted)
      await addOnce("INITIATIVE", t.id, a.userId, s["initiative.bonus"], `Self-initiated work accepted by a founder: +${fmt(s["initiative.bonus"])}`, at);
  }
}

/** A task left DONE (reopened, sent back) or its scoring inputs changed: remove its events so they can be re-earned. */
export async function revokeScore(taskId: string) {
  await db.scoreEvent.deleteMany({ where: { taskId, kind: { in: ["TASK_DONE", "IMPACT", "INITIATIVE"] } } });
  await db.jobRun.deleteMany({ where: { kind: { in: ["score-TASK_DONE", "score-IMPACT", "score-INITIATIVE"] }, key: { startsWith: `${taskId}:` } } });
}

export async function addPenaltyOnce(kind: "MISSED_RECURRING" | "OVERDUE_PENALTY", taskId: string, userId: string, points: number, breakdown: string) {
  return addOnce(kind, taskId, userId, -Math.abs(points), breakdown, new Date());
}

/**
 * Open task overdue by more than N days with no Blocked reason: one-time penalty per assignee.
 * Blocked tasks are never penalised, so raising a blocker early is always safe.
 */
export async function applyOverduePenalties(now = new Date()) {
  const s = await getSettings();
  const cutoff = new Date(now.getTime() - s["penalty.overdueDays"] * 864e5);
  const tasks = await db.task.findMany({
    where: { status: { notIn: ["DONE", "CANCELLED", "BLOCKED"] }, dueAt: { lt: cutoff } },
    include: { assignees: true },
    take: 500,
  });
  let n = 0;
  for (const t of tasks)
    for (const a of t.assignees)
      if (await addPenaltyOnce("OVERDUE_PENALTY", t.id, a.userId, s["penalty.overdue"], `Overdue more than ${fmt(s["penalty.overdueDays"])} days without a blocker reason: -${fmt(s["penalty.overdue"])}`)) n++;
  return n;
}
