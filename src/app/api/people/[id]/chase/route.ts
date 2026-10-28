import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";
import { HttpError, teamIds } from "@/lib/tasks";
import { notify } from "@/lib/notify";
import { istDateKey } from "@/lib/time";

// "Nudge" one person about everything overdue or blocked: ONE friendly message, at most once a day per person,
// so chasing can never turn into spam. Managers can only nudge their own team.
export const POST = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  if (!isLead(u)) throw new HttpError(403, "Only founders and managers can nudge");
  if (params.id === u.id) throw new HttpError(400, "That's you");
  if (u.role === "MANAGER" && !(await teamIds(u.id)).includes(params.id)) throw new HttpError(403, "You can only nudge people on your team");
  const person = await db.user.findFirst({ where: { id: params.id, active: true }, select: { id: true, name: true } });
  if (!person) throw new HttpError(404, "Person not found");

  const now = new Date();
  const tasks = await db.task.findMany({
    where: { assignees: { some: { userId: person.id } }, status: { notIn: ["DONE", "CANCELLED"] }, OR: [{ dueAt: { lt: now } }, { status: "BLOCKED" }] },
    select: { id: true, title: true, status: true, dueAt: true }, orderBy: { dueAt: "asc" }, take: 20,
  });
  if (tasks.length === 0) throw new HttpError(409, `${person.name} has nothing overdue or blocked right now. 🎉`);

  try {
    await db.jobRun.create({ data: { kind: "nudge", key: `${person.id}:${istDateKey(now)}` } });
  } catch {
    throw new HttpError(409, `You already nudged ${person.name} today. Give them a little time.`);
  }
  const overdue = tasks.filter((t) => t.dueAt && t.dueAt < now).length;
  const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
  const list = tasks.slice(0, 4).map((t) => t.title).join("; ");
  await notify({
    userId: person.id, kind: "REMINDER",
    title: `${u.name} is checking in on your tasks`,
    body: `${overdue ? `${overdue} overdue` : ""}${overdue && blocked ? ", " : ""}${blocked ? `${blocked} blocked` : ""}: ${list}${tasks.length > 4 ? "…" : ""}. Need help? Reply or comment on the task.`,
    url: "/my-day",
  });
  await db.auditLog.create({ data: { actorId: u.id, action: "NUDGE_SENT", target: person.id, meta: `${tasks.length} tasks` } });
  return NextResponse.json({ ok: true, tasks: tasks.length });
});
