import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { visibleWhere } from "./tasks";
import type { SessionUser } from "./auth";

export type TaskFilters = { person?: string; dept?: string; priority?: string; tag?: string };

/** Visibility scope AND the user's chosen filters. */
export async function filteredWhere(u: SessionUser, f: TaskFilters): Promise<Prisma.TaskWhereInput> {
  const and: Prisma.TaskWhereInput[] = [await visibleWhere(u)];
  if (f.person) and.push({ assignees: { some: { userId: f.person } } });
  if (f.dept) and.push({ departmentId: f.dept });
  if (f.priority && ["P1", "P2", "P3", "P4"].includes(f.priority)) and.push({ priority: f.priority });
  if (f.tag) and.push({ tags: { contains: f.tag } });
  return { AND: and };
}

export async function filterOptions() {
  const [people, departments] = await Promise.all([
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { people, departments };
}
