import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";
import { assertDepartment, assertPeople } from "@/lib/orgGuard";
import { HttpError } from "@/lib/tasks";
import { joinChecklist, templateSchema } from "@/lib/templates";

export const POST = authed(async (req, u) => {
  if (!isLead(u)) throw new HttpError(403, "Only founders and managers can create templates");
  const t = templateSchema.parse(await req.json());
  await assertDepartment(t.departmentId);
  const row = await db.taskTemplate.create({
    data: { name: t.name, title: t.title, description: t.description, priority: t.priority, complexity: t.complexity, estimateHours: t.estimateHours ?? null, departmentId: t.departmentId || null, checklist: joinChecklist(t.checklist), createdById: u.id },
  });
  await db.auditLog.create({ data: { actorId: u.id, action: "TEMPLATE_CREATED", target: row.id, meta: row.name } });
  return NextResponse.json({ template: row }, { status: 201 });
});
