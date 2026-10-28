import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { notifyMany } from "./notify";
import { onTaskSaved } from "./recurring";
import { awayOn } from "./leave";
import { assertDepartment } from "./orgGuard";
import { canAssignOthers, canReview, isLead } from "./rbac";
import { STATUS_LABEL, STATUSES, PRIORITIES } from "./constants";
import type { SessionUser } from "./auth";

export { HttpError } from "./httpError";
import { HttpError } from "./httpError";

export const taskInclude = {
  assignees: { include: { user: { select: { id: true, name: true } } } },
  department: true,
  creator: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

export type TaskCard = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

/** IDs of people a manager leads (direct reports). */
export async function teamIds(managerId: string) {
  const rows = await db.employeeProfile.findMany({ where: { managerId }, select: { userId: true } });
  return rows.map((r) => r.userId);
}

/** Prisma `where` limiting tasks to what this user may see. Enforced server-side everywhere. */
export async function visibleWhere(u: SessionUser): Promise<Prisma.TaskWhereInput> {
  if (u.role === "FOUNDER") return {};
  const ids = [u.id];
  if (u.role === "MANAGER") ids.push(...(await teamIds(u.id)));
  return { OR: [{ creatorId: u.id }, { assignees: { some: { userId: { in: ids } } } }] };
}

/** Task the user can see AND contribute to (checklist, attachments): creator, assignee, or a lead. */
export async function loadContributableTask(u: SessionUser, id: string) {
  const task = await db.task.findFirst({ where: { AND: [{ id }, await visibleWhere(u)] }, include: { assignees: true } });
  if (!task) throw new HttpError(404, "Task not found");
  const mine = task.creatorId === u.id || task.assignees.some((a) => a.userId === u.id);
  if (!mine && !isLead(u)) throw new HttpError(403, "You can't change this task");
  return task;
}

export const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional().default(""),
  assigneeIds: z.array(z.string()).optional().default([]),
  departmentId: z.string().nullish(),
  priority: z.enum(PRIORITIES).optional().default("P3"),
  complexity: z.number().int().min(1).max(5).optional().default(2),
  dueAt: z.string().datetime().nullish(),
  estimateHours: z.number().min(0).max(1000).nullish(),
  location: z.string().max(300).nullish(),
  tags: z.string().max(200).optional().default(""),
  requiresProof: z.boolean().optional().default(false),
  checklist: z.array(z.string().trim().min(1).max(200)).max(30).optional().default([]),
});

export async function createTask(u: SessionUser, input: z.infer<typeof createSchema>) {
  let assigneeIds = input.assigneeIds.length ? input.assigneeIds : [u.id];
  // Non-leads assigning to others is a *request*: the assignee sees who raised it,
  // and it is not counted as self-initiated work.
  const assigningOthers = assigneeIds.some((id) => id !== u.id);
  const selfInitiated = !isLead(u) && !assigningOthers;
  assigneeIds = Array.from(new Set(assigneeIds));

  const valid = await db.user.findMany({ where: { id: { in: assigneeIds }, active: true }, select: { id: true } });
  if (valid.length !== assigneeIds.length) throw new HttpError(400, "Unknown assignee");
  await assertDepartment(input.departmentId);

  // Someone on approved leave today: their named cover person gets the task too, so nothing sits idle.
  const covering: string[] = [];
  try {
    for (const [, a] of await awayOn(assigneeIds)) {
      if (a.backupUserId && !assigneeIds.includes(a.backupUserId) && !covering.includes(a.backupUserId) && (await db.user.count({ where: { id: a.backupUserId, active: true } }))) covering.push(a.backupUserId);
    }
  } catch { /* leave tables not upgraded yet: carry on without cover */ }
  assigneeIds = [...assigneeIds, ...covering];

  const task = await db.task.create({
    data: {
      title: input.title,
      description: input.description,
      priority: input.priority,
      complexity: input.complexity,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      estimateHours: input.estimateHours ?? null,
      location: input.location ?? null,
      tags: input.tags,
      requiresProof: input.requiresProof,
      departmentId: input.departmentId ?? null,
      creatorId: u.id,
      selfInitiated,
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
      checklist: { create: input.checklist.map((text, position) => ({ text, position })) },
      activity: { create: { actorId: u.id, action: "CREATED", detail: selfInitiated ? "Self-initiated" : "" } },
    },
    include: taskInclude,
  });

  const url = `/tasks/${task.id}`;
  const pr = task.priority === "P1" ? " [P1 URGENT]" : "";
  // Assignees get an immediate email + bell (acceptance: within 1 minute).
  await notifyMany(assigneeIds, {
    kind: "ASSIGNED",
    title: `New task${pr}: ${task.title}`,
    body: `${u.name} assigned you a ${task.priority} task.`,
    url,
  }, u.id);

  if (selfInitiated) {
    const founders = await db.user.findMany({ where: { role: "FOUNDER", active: true }, select: { id: true } });
    await notifyMany(founders.map((f) => f.id), {
      kind: "ASSIGNED",
      title: `Self-initiated: ${task.title}`,
      body: `${u.name} logged their own work.`,
      url,
      email: false, // in-app only; avoids founder inbox noise
    }, u.id);
  }
  return task;
}

export const patchSchema = z.object({
  status: z.enum(STATUSES).optional(),
  blockedReason: z.string().trim().max(500).optional(),
  proofNote: z.string().trim().max(1000).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  complexity: z.number().int().min(1).max(5).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
  review: z.enum(["APPROVED", "SENT_BACK"]).optional(),
  reviewNote: z.string().max(500).optional(),
  impactStars: z.number().int().min(0).max(5).optional(),
  acceptInitiative: z.boolean().optional(),
});

export async function updateTask(u: SessionUser, id: string, input: z.infer<typeof patchSchema>) {
  const where = await visibleWhere(u);
  const task = await db.task.findFirst({ where: { AND: [{ id }, where] }, include: taskInclude });
  if (!task) throw new HttpError(404, "Task not found");

  const isAssignee = task.assignees.some((a) => a.userId === u.id);
  const lead = isLead(u);
  const isCreator = task.creatorId === u.id;
  const notifyIds = [task.creatorId, ...task.assignees.map((a) => a.userId)];
  const data: Prisma.TaskUpdateInput = {};
  const log: { action: string; detail: string }[] = [];
  const after: (() => Promise<void>)[] = [];

  // Editing core fields: leads or the creator only.
  const editsFields = ["title", "description", "priority", "complexity", "dueAt", "assigneeIds"].some(
    (k) => (input as Record<string, unknown>)[k] !== undefined
  );
  if (editsFields && !lead && !isCreator) throw new HttpError(403, "Only the creator or a lead can edit this task");
  if (input.assigneeIds && !canAssignOthers(u) && input.assigneeIds.some((a) => a !== u.id))
    throw new HttpError(403, "You can't assign work to others");

  const notifyChange = (title: string, body: string) =>
    after.push(() => notifyMany(task.assignees.map((x) => x.userId), { kind: "STATUS", title, body, url: `/tasks/${id}` }, u.id));

  if (input.title !== undefined && input.title !== task.title) {
    data.title = input.title;
    log.push({ action: "EDITED", detail: `Title: "${task.title}" → "${input.title}"` });
  }
  if (input.description !== undefined && input.description !== task.description) {
    data.description = input.description;
    log.push({ action: "EDITED", detail: "Description updated" });
  }
  if (input.complexity !== undefined && input.complexity !== task.complexity) {
    data.complexity = input.complexity;
    log.push({ action: "EDITED", detail: `Complexity ${task.complexity} → ${input.complexity}` });
  }
  if (input.priority !== undefined && input.priority !== task.priority) {
    data.priority = input.priority;
    log.push({ action: "PRIORITY", detail: `${task.priority} → ${input.priority}` });
    notifyChange(`Priority changed to ${input.priority}: ${task.title}`, `${u.name} changed the priority from ${task.priority} to ${input.priority}.`);
  }
  if (input.dueAt !== undefined) {
    const nextDue = input.dueAt ? new Date(input.dueAt) : null;
    if ((nextDue?.getTime() ?? null) !== (task.dueAt?.getTime() ?? null)) {
      data.dueAt = nextDue;
      log.push({ action: "DUE", detail: nextDue ? `Due ${nextDue.toISOString()}` : "Due date cleared" });
      // a moved deadline should be able to trigger its reminders again
      after.push(async () => void (await db.jobRun.deleteMany({ where: { key: id, kind: { in: ["remind-2h", "remind-overdue"] } } })));
      notifyChange(`Due date changed: ${task.title}`, `${u.name} ${nextDue ? "moved the deadline" : "removed the deadline"}.`);
    }
  }

  if (input.assigneeIds) {
    const next = Array.from(new Set(input.assigneeIds));
    if (next.length === 0) throw new HttpError(400, "A task needs at least one assignee");
    const valid = await db.user.count({ where: { id: { in: next }, active: true } });
    if (valid !== next.length) throw new HttpError(400, "Unknown or inactive assignee");
    const current = task.assignees.map((a) => a.userId);
    const added = next.filter((x) => !current.includes(x));
    const removed = current.filter((x) => !next.includes(x));
    if (added.length || removed.length) {
      data.assignees = { deleteMany: { userId: { notIn: next } }, create: added.map((userId) => ({ userId })) };
      log.push({ action: "ASSIGNED", detail: `${added.length ? `+${added.length} added` : ""}${added.length && removed.length ? ", " : ""}${removed.length ? `${removed.length} removed` : ""}` });
    }
    if (added.length)
      after.push(() => notifyMany(added, { kind: "ASSIGNED", title: `New task: ${task.title}`, body: `${u.name} assigned you a ${input.priority ?? task.priority} task.`, url: `/tasks/${id}` }, u.id));
    if (removed.length)
      after.push(() => notifyMany(removed, { kind: "STATUS", title: `Removed from: ${task.title}`, body: `${u.name} took you off this task.`, url: `/tasks/${id}`, email: false }, u.id));
  }

  // Status transitions
  if (input.status && input.status !== task.status) {
    if (!isAssignee && !lead) throw new HttpError(403, "Only assignees or leads can change status");
    const next = input.status;
    if (next === "BLOCKED") {
      if (!input.blockedReason) throw new HttpError(400, "A reason is required when marking a task Blocked");
      data.blockedReason = input.blockedReason;
    } else {
      data.blockedReason = null;
    }
    if (next === "DONE") {
      if (task.requiresProof && !(input.proofNote || task.proofNote))
        throw new HttpError(400, "This task needs proof (add a note or link) before it can be marked Done");
      if (input.proofNote) data.proofNote = input.proofNote;
      data.completedAt = new Date();
    } else if (task.status === "DONE") {
      data.completedAt = null;
    }
    data.status = next;
    data.reviewState = null;
    log.push({
      action: "STATUS",
      detail: `${STATUS_LABEL[task.status]} → ${STATUS_LABEL[next]}${next === "BLOCKED" ? ` (${input.blockedReason})` : ""}`,
    });
    const kind = next === "BLOCKED" ? "BLOCKED" : "STATUS";
    const title = next === "BLOCKED" ? `Blocked: ${task.title}` : `${STATUS_LABEL[next]}: ${task.title}`;
    const body = next === "BLOCKED" ? `${u.name} is blocked — ${input.blockedReason}` : `${u.name} moved this to ${STATUS_LABEL[next]}.`;
    // Blocked is escalated to the assigner (creator); other changes go to creator + assignees.
    const targets = next === "BLOCKED" ? [task.creatorId] : notifyIds;
    after.push(() => notifyMany(targets, { kind, title, body, url: `/tasks/${id}` }, u.id));
  }

  // Founder/lead review
  if (input.review) {
    if (!canReview(u)) throw new HttpError(403, "Only leads can review");
    if (task.status !== "IN_REVIEW" && task.status !== "DONE") throw new HttpError(400, "Task is not in review");
    data.reviewState = input.review;
    if (input.review === "APPROVED") {
      data.status = "DONE";
      if (!task.completedAt) data.completedAt = new Date();
      if (input.impactStars !== undefined) data.impactStars = input.impactStars;
      log.push({ action: "REVIEW", detail: "Approved" });
      after.push(() => notifyMany(task.assignees.map((a) => a.userId), { kind: "APPROVED", title: `Approved: ${task.title}`, body: `${u.name} approved your work.`, url: `/tasks/${id}` }, u.id));
    } else {
      data.status = "IN_PROGRESS";
      data.completedAt = null;
      log.push({ action: "REVIEW", detail: `Sent back${input.reviewNote ? ` — ${input.reviewNote}` : ""}` });
      after.push(() => notifyMany(task.assignees.map((a) => a.userId), { kind: "SENT_BACK", title: `Sent back: ${task.title}`, body: `${u.name}: ${input.reviewNote ?? "please revisit"}`, url: `/tasks/${id}` }, u.id));
    }
  }
  if (input.acceptInitiative !== undefined) {
    if (!canReview(u)) throw new HttpError(403, "Only leads can accept initiatives");
    data.initiativeAccepted = input.acceptInitiative;
    log.push({ action: "REVIEW", detail: input.acceptInitiative ? "Initiative accepted" : "Initiative unmarked" });
  }

  if (input.proofNote && !data.proofNote && (isAssignee || lead)) data.proofNote = input.proofNote;

  const updated = await db.task.update({
    where: { id },
    data: { ...data, activity: log.length ? { create: log.map((l) => ({ ...l, actorId: u.id })) } : undefined },
    include: taskInclude,
  });
  await Promise.allSettled(after.map((f) => f()));
  // Keep scoring and recurring-instance state in step. Never fail the user's save over it.
  try {
    await onTaskSaved(task, updated);
    if (input.acceptInitiative === false) {
      await db.scoreEvent.deleteMany({ where: { taskId: id, kind: "INITIATIVE" } });
      await db.jobRun.deleteMany({ where: { kind: "score-INITIATIVE", key: { startsWith: `${id}:` } } });
    }
  } catch (e) {
    console.error("[score] sync failed for task", id, e instanceof Error ? e.message : e);
  }
  return updated;
}

export async function addComment(u: SessionUser, taskId: string, body: string) {
  const where = await visibleWhere(u);
  const task = await db.task.findFirst({ where: { AND: [{ id: taskId }, where] }, include: { assignees: true } });
  if (!task) throw new HttpError(404, "Task not found");
  const c = await db.taskComment.create({
    data: { taskId, authorId: u.id, body },
    include: { author: { select: { id: true, name: true } } },
  });
  await db.taskActivity.create({ data: { taskId, actorId: u.id, action: "COMMENT", detail: body.slice(0, 80) } });
  // @mentions notify the named person too
  const mentioned = await db.user.findMany({ where: { active: true } });
  const mIds = mentioned.filter((m) => body.toLowerCase().includes(`@${m.name.split(" ")[0].toLowerCase()}`)).map((m) => m.id);
  await notifyMany([task.creatorId, ...task.assignees.map((a) => a.userId), ...mIds], {
    kind: "COMMENT",
    title: `${u.name} commented on ${task.title}`,
    body: body.slice(0, 200),
    url: `/tasks/${taskId}`,
  }, u.id);
  return c;
}

