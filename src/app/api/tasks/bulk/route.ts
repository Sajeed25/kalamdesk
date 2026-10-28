import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";
import { HttpError, updateTask, visibleWhere } from "@/lib/tasks";
import { PRIORITIES, STATUSES } from "@/lib/constants";

const schema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  action: z.enum(["priority", "status", "assign", "due"]),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(STATUSES).optional(),
  blockedReason: z.string().trim().max(500).optional(),
  userId: z.string().optional(),
  mode: z.enum(["add", "replace"]).default("add"),
  dueAt: z.string().datetime().nullable().optional(),
});

// Founders and managers only. Each task goes through the SAME rules as a single edit (visibility, review,
// Blocked needs a reason, notifications, scoring), so a bulk change can never do more than a manual one.
export const POST = authed(async (req, u) => {
  if (!isLead(u)) throw new HttpError(403, "Only founders and managers can change tasks in bulk");
  const b = schema.parse(await req.json());
  if (b.action === "priority" && !b.priority) throw new HttpError(400, "Choose a priority");
  if (b.action === "status" && !b.status) throw new HttpError(400, "Choose a status");
  if (b.action === "assign") {
    const target = b.userId && (await db.user.findFirst({ where: { id: b.userId, active: true }, select: { id: true } }));
    if (!target) throw new HttpError(400, "Choose who to assign");
  }
  if (b.action === "due" && b.dueAt === undefined) throw new HttpError(400, "Choose a due date (or clear it)");

  const scope = await visibleWhere(u);
  const failed: { id: string; title: string; error: string }[] = [];
  let updated = 0;
  for (const id of Array.from(new Set(b.ids))) {
    const t = await db.task.findFirst({ where: { AND: [{ id }, scope] }, select: { title: true, assignees: { select: { userId: true } } } });
    if (!t) { failed.push({ id, title: "(not found)", error: "Task not found or not visible to you" }); continue; }
    try {
      if (b.action === "priority") await updateTask(u, id, { priority: b.priority });
      else if (b.action === "status") await updateTask(u, id, { status: b.status, blockedReason: b.blockedReason });
      else if (b.action === "due") await updateTask(u, id, { dueAt: b.dueAt ?? null });
      else {
        const ids = b.mode === "replace" ? [b.userId!] : Array.from(new Set([...t.assignees.map((a) => a.userId), b.userId!]));
        await updateTask(u, id, { assigneeIds: ids });
      }
      updated++;
    } catch (e) {
      failed.push({ id, title: t.title, error: e instanceof HttpError ? e.message : "Could not update" });
    }
  }
  await db.auditLog.create({ data: { actorId: u.id, action: "BULK_TASK_UPDATE", target: b.action, meta: `${updated} updated, ${failed.length} failed` } });
  return NextResponse.json({ updated, failed });
});
