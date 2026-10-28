import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { departmentFields } from "@/lib/departmentSchema";

export const POST = authed(async (req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can manage departments");
  const input = z.object(departmentFields).parse(await req.json());
  // SQLite compares names case-sensitively, so check case-insensitively ourselves.
  const all = await db.department.findMany({ select: { name: true } });
  if (all.some((d) => d.name.toLowerCase() === input.name.toLowerCase())) throw new HttpError(409, "A department with that name already exists");
  const dept = await db.department.create({ data: input });
  await db.auditLog.create({ data: { actorId: u.id, action: "DEPARTMENT_CREATED", target: dept.id, meta: dept.name } });
  return NextResponse.json({ department: dept }, { status: 201 });
});
