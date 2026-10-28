import type { RecurringRule } from "@prisma/client";
import { db } from "./db";
import { notify } from "./notify";
import { occurrencesBetween } from "./recurrence";
import { endOfIstDay } from "./time";
import { addPenaltyOnce, getSettings, revokeScore, syncScore } from "./scoring";

export const ruleAssignees = (r: { assigneeIds: string }) => r.assigneeIds.split(",").map((s) => s.trim()).filter(Boolean);

/**
 * Create the task + tracking instance for every occurrence that falls inside the lead window
 * (now, now + leadHours]. One task per assignee, so each person's compliance and score are their own.
 * A JobRun row per (rule, occurrence, person) makes this safe to run on every cron tick.
 */
export async function generateForRule(rule: RecurringRule, now = new Date()) {
  const until = new Date(now.getTime() + rule.leadHours * 3600 * 1000);
  const occurrences = occurrencesBetween(rule.rrule, now, until);
  let created = 0;
  for (const at of occurrences) {
    for (const userId of ruleAssignees(rule)) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { active: true } });
      if (!user?.active) continue;
      try {
        await db.jobRun.create({ data: { kind: "recurring-gen", key: `${rule.id}:${at.toISOString()}:${userId}` } });
      } catch {
        continue; // already generated
      }
      const task = await db.task.create({
        data: {
          title: rule.title, description: rule.description, priority: rule.priority, complexity: 2,
          dueAt: at, location: rule.location, departmentId: rule.departmentId, creatorId: rule.creatorId,
          recurringRuleId: rule.id,
          assignees: { create: [{ userId }] },
          instances: { create: [{ ruleId: rule.id, forDate: at }] },
          activity: { create: [{ actorId: rule.creatorId, action: "CREATED", detail: "Recurring activity" }] },
        },
      });
      await notify({ userId, kind: "ASSIGNED", title: `Upcoming: ${rule.title}`, body: rule.location ? `At ${rule.location}` : "Recurring activity", url: `/tasks/${task.id}` });
      created++;
    }
  }
  return created;
}

export async function generateDue(now = new Date()) {
  const rules = await db.recurringRule.findMany({ where: { active: true } });
  let created = 0;
  for (const r of rules) created += await generateForRule(r, now);
  return created;
}

/** Called after a recurring task is completed: on time = DONE, after its time = LATE. */
export async function markInstanceDone(taskId: string, completedAt: Date, dueAt: Date | null) {
  const inst = await db.taskInstance.findFirst({ where: { taskId, outcome: "PENDING" } });
  if (!inst) return;
  const outcome = !dueAt || completedAt <= dueAt ? "DONE" : "LATE";
  await db.taskInstance.update({ where: { id: inst.id }, data: { outcome } });
}

/** A recurring task was reopened before it was ever marked missed. */
export async function markInstanceReopened(taskId: string) {
  await db.taskInstance.updateMany({ where: { taskId, outcome: { in: ["DONE", "LATE"] } }, data: { outcome: "PENDING" } });
}

/**
 * Anything not done by the end of its IST day is Missed: the task is closed (Cancelled, logged),
 * the penalty is applied once per person, and the assignee and creator are told.
 */
export async function markMissed(now = new Date()) {
  const s = await getSettings();
  const pending = await db.taskInstance.findMany({
    where: { outcome: "PENDING", forDate: { lt: now } },
    include: { task: { include: { assignees: true } }, rule: true },
    take: 500,
  });
  let missed = 0;
  for (const inst of pending) {
    if (endOfIstDay(inst.forDate) >= now) continue; // still today
    const t = inst.task;
    if (t.status === "DONE") {
      const outcome = t.completedAt && t.dueAt && t.completedAt > t.dueAt ? "LATE" : "DONE";
      await db.taskInstance.update({ where: { id: inst.id }, data: { outcome } });
      continue;
    }
    await db.taskInstance.update({ where: { id: inst.id }, data: { outcome: "MISSED" } });
    await db.task.update({
      where: { id: t.id },
      data: { status: "CANCELLED", activity: { create: [{ actorId: t.creatorId, action: "STATUS", detail: "Missed: not completed by end of day" }] } },
    });
    for (const a of t.assignees) {
      await addPenaltyOnce("MISSED_RECURRING", t.id, a.userId, s["penalty.missedRecurring"], `Missed recurring activity "${t.title}": -${s["penalty.missedRecurring"]}`);
      await notify({ userId: a.userId, kind: "REMINDER", title: `Missed: ${t.title}`, body: "It was not completed by end of day.", url: `/tasks/${t.id}` });
    }
    if (!t.assignees.some((a) => a.userId === t.creatorId))
      await notify({ userId: t.creatorId, kind: "REMINDER", title: `Missed: ${t.title}`, body: "A recurring activity was not completed.", url: `/tasks/${t.id}`, email: false });
    missed++;
  }
  return missed;
}

/**
 * Single entry point used after any task save: keeps scoring and recurring-instance state in step
 * with what just happened. `before` is the status before the change.
 */
export async function onTaskSaved(
  before: { status: string; priority: string; complexity: number; dueAt: Date | null },
  after: { id: string; status: string; priority: string; complexity: number; dueAt: Date | null; completedAt: Date | null; recurringRuleId: string | null }
) {
  const wasDone = before.status === "DONE";
  const isDone = after.status === "DONE";
  const rescore = wasDone && isDone && (before.priority !== after.priority || before.complexity !== after.complexity || before.dueAt?.getTime() !== after.dueAt?.getTime());
  if ((wasDone && !isDone) || rescore) await revokeScore(after.id);
  if (isDone) {
    await syncScore(after.id);
    if (after.recurringRuleId && !wasDone) await markInstanceDone(after.id, after.completedAt ?? new Date(), after.dueAt);
  } else if (wasDone && after.recurringRuleId) {
    await markInstanceReopened(after.id);
  }
}
