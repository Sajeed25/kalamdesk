import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";
import { HttpError, visibleWhere } from "@/lib/tasks";
import { notifyMany } from "@/lib/notify";
import { istDateKey } from "@/lib/time";

// Nudge the assignees of ONE task. Once a day per task.
export const POST = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  if (!isLead(u)) throw new HttpError(403, "Only founders and managers can nudge");
  const t = await db.task.findFirst({ where: { AND: [{ id: params.id }, await visibleWhere(u)] }, select: { id: true, title: true, status: true, assignees: { select: { userId: true } } } });
  if (!t) throw new HttpError(404, "Task not found");
  if (t.status === "DONE" || t.status === "CANCELLED") throw new HttpError(409, "That task is already closed");
  const ids = t.assignees.map((a) => a.userId).filter((i) => i !== u.id);
  if (ids.length === 0) throw new HttpError(400, "Nobody else is assigned to this task");
  try {
    await db.jobRun.create({ data: { kind: "nudge-task", key: `${t.id}:${istDateKey()}` } });
  } catch {
    throw new HttpError(409, "You already nudged this task today.");
  }
  await notifyMany(ids, { kind: "REMINDER", title: `${u.name} is checking on: ${t.title}`, body: "Any update? Reply here or comment on the task.", url: `/tasks/${t.id}` });
  await db.auditLog.create({ data: { actorId: u.id, action: "NUDGE_TASK", target: t.id } });
  return NextResponse.json({ ok: true });
});
