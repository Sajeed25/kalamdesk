import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { createSchema, createTask, taskInclude, visibleWhere } from "@/lib/tasks";

export const GET = authed(async (req, u) => {
  const p = new URL(req.url).searchParams;
  const and: object[] = [await visibleWhere(u)];
  if (p.get("assignee")) and.push({ assignees: { some: { userId: p.get("assignee")! } } });
  if (p.get("department")) and.push({ departmentId: p.get("department") });
  if (p.get("priority")) and.push({ priority: p.get("priority") });
  if (p.get("tag")) and.push({ tags: { contains: p.get("tag")! } });
  const tasks = await db.task.findMany({ where: { AND: and }, include: taskInclude, orderBy: [{ dueAt: "asc" }], take: 500 });
  return NextResponse.json({ tasks });
});

export const POST = authed(async (req, u) => {
  const input = createSchema.parse(await req.json());
  const task = await createTask(u, input);
  return NextResponse.json({ task }, { status: 201 });
});
