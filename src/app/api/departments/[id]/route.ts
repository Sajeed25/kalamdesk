import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { departmentFields } from "@/lib/departmentSchema";

export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can manage departments");
  const input = z.object(departmentFields).partial().parse(await req.json());
  const dept = await db.department.findUnique({ where: { id: params.id } });
  if (!dept) throw new HttpError(404, "Department not found");
  if (input.name && input.name.toLowerCase() !== dept.name.toLowerCase()) {
    const all = await db.department.findMany({ select: { name: true } });
    if (all.some((d) => d.name.toLowerCase() === input.name!.toLowerCase())) throw new HttpError(409, "A department with that name already exists");
  }
  const updated = await db.department.update({ where: { id: params.id }, data: input });
  await db.auditLog.create({ data: { actorId: u.id, action: "DEPARTMENT_UPDATED", target: params.id, meta: `${dept.name} → ${updated.name}` } });
  return NextResponse.json({ department: updated });
});

// A department that people or tasks still point at can't be deleted; reassign them first.
export const DELETE = authed<{ params: { id: string } }>(async (_req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can manage departments");
  const dept = await db.department.findUnique({ where: { id: params.id } });
  if (!dept) throw new HttpError(404, "Department not found");
  const [people, tasks, rules] = await Promise.all([
    db.user.count({ where: { departmentId: params.id } }),
    db.task.count({ where: { departmentId: params.id } }),
    db.recurringRule.count({ where: { departmentId: params.id } }),
  ]);
  if (people || tasks || rules)
    throw new HttpError(409, `Can't delete ${dept.name}: it has ${people} people, ${tasks} tasks and ${rules} recurring rules. Move them to another department first.`);
  await db.department.delete({ where: { id: params.id } });
  await db.auditLog.create({ data: { actorId: u.id, action: "DEPARTMENT_DELETED", target: params.id, meta: dept.name } });
  return NextResponse.json({ ok: true });
});
