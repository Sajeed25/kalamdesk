import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder, isLead } from "@/lib/rbac";
import { HttpError, teamIds } from "@/lib/tasks";
import { notify } from "@/lib/notify";
import { istDateKey } from "@/lib/time";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT", "CANCEL"]),
  note: z.string().trim().max(300).optional().default(""),
  handOver: z.boolean().optional().default(false), // on approval: add the cover person to the open tasks due during the leave
});

export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  const b = schema.parse(await req.json());
  const l = await db.leaveRequest.findUnique({ where: { id: params.id } });
  if (!l) throw new HttpError(404, "Leave request not found");
  const person = await db.user.findUnique({ where: { id: l.userId }, select: { name: true } });

  if (b.action === "CANCEL") {
    if (l.userId !== u.id) throw new HttpError(403, "Only the person can cancel their leave");
    if (!["PENDING", "APPROVED"].includes(l.status) || l.toDate < istDateKey()) throw new HttpError(409, "This leave can't be cancelled any more");
    await db.leaveRequest.update({ where: { id: l.id }, data: { status: "CANCELLED" } });
    return NextResponse.json({ ok: true });
  }

  if (!isLead(u)) throw new HttpError(403, "Only founders and managers can decide on leave");
  if (l.userId === u.id) throw new HttpError(403, "You can't decide on your own leave. Ask a founder.");
  if (!isFounder(u) && !(await teamIds(u.id)).includes(l.userId)) throw new HttpError(403, "You can only decide on leave for your own team");
  if (l.status !== "PENDING") throw new HttpError(409, "This request has already been decided");
  if (b.action === "REJECT" && b.note.length < 3) throw new HttpError(400, "Say briefly why");

  const approve = b.action === "APPROVE";
  await db.leaveRequest.update({ where: { id: l.id }, data: { status: approve ? "APPROVED" : "REJECTED", decidedById: u.id, decidedAt: new Date(), decisionNote: b.note || null } });
  await db.auditLog.create({ data: { actorId: u.id, action: approve ? "LEAVE_APPROVED" : "LEAVE_REJECTED", target: l.userId, meta: `${l.fromDate}..${l.toDate}` } });

  let handed = 0;
  if (approve && b.handOver && l.backupUserId) {
    const from = new Date(`${l.fromDate}T00:00:00+05:30`), to = new Date(`${l.toDate}T23:59:59+05:30`);
    const tasks = await db.task.findMany({
      where: { status: { notIn: ["DONE", "CANCELLED"] }, dueAt: { gte: from, lte: to }, assignees: { some: { userId: l.userId }, none: { userId: l.backupUserId } } },
      select: { id: true }, take: 100,
    });
    for (const t of tasks) await db.taskAssignee.create({ data: { taskId: t.id, userId: l.backupUserId } });
    handed = tasks.length;
    if (handed) await notify({ userId: l.backupUserId, kind: "ASSIGNED", title: `You're covering for ${person?.name}`, body: `${handed} of their tasks due during the leave now have your name too.`, url: "/my-day" });
  }
  await notify({ userId: l.userId, kind: "STATUS", title: `Your leave was ${approve ? "approved" : "declined"}`, body: `${l.fromDate}${l.fromDate !== l.toDate ? ` to ${l.toDate}` : ""}${b.note ? `: ${b.note}` : ""}`, url: "/leave" });
  if (approve && l.backupUserId && !handed) await notify({ userId: l.backupUserId, kind: "STATUS", title: `You're the cover for ${person?.name}`, body: `${l.fromDate}${l.fromDate !== l.toDate ? ` to ${l.toDate}` : ""}. New tasks for them will also reach you.`, url: "/leave", email: false });
  return NextResponse.json({ ok: true, handed });
});
