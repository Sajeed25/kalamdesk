import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder, isLead } from "@/lib/rbac";
import { assertDepartment, assertPeople } from "@/lib/orgGuard";
import { HttpError } from "@/lib/tasks";
import { joinChecklist, templateSchema } from "@/lib/templates";

async function load(u: { id: string; role: string }, id: string) {
  if (!isLead(u as never)) throw new HttpError(403, "Only founders and managers can change templates");
  const t = await db.taskTemplate.findUnique({ where: { id } });
  if (!t) throw new HttpError(404, "Template not found");
  // managers can only change their own; founders can change any
  if (!isFounder(u as never) && t.createdById !== u.id) throw new HttpError(403, "You can only change templates you created");
  return t;
}

export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  const t = await load(u, params.id);
  const b = templateSchema.parse(await req.json());
  await assertDepartment(b.departmentId);
  await db.taskTemplate.update({ where: { id: t.id }, data: { name: b.name, title: b.title, description: b.description, priority: b.priority, complexity: b.complexity, estimateHours: b.estimateHours ?? null, departmentId: b.departmentId || null, checklist: joinChecklist(b.checklist) } });
  return NextResponse.json({ ok: true });
});

export const DELETE = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  const t = await load(u, params.id);
  await db.taskTemplate.delete({ where: { id: t.id } });
  await db.auditLog.create({ data: { actorId: u.id, action: "TEMPLATE_DELETED", target: t.id, meta: t.name } });
  return NextResponse.json({ ok: true });
});
