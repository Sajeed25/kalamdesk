import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import DepartmentManager from "@/components/DepartmentManager";

export const dynamic = "force-dynamic";

export default async function Departments() {
  const u = await requireUser();
  if (!isFounder(u)) redirect("/people");
  const depts = await db.department.findMany({ include: { _count: { select: { users: true, tasks: true } } }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="page-title">Departments</h1>
      <DepartmentManager rows={depts.map((d) => ({ id: d.id, name: d.name, color: d.color, people: d._count.users, tasks: d._count.tasks }))} />
    </div>
  );
}
