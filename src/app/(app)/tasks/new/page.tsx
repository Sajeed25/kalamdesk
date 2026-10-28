import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";
import { filterOptions } from "@/lib/filters";
import TaskForm from "@/components/TaskForm";

export default async function NewTask() {
  const u = await requireUser();
  const [{ people, departments }, templates] = await Promise.all([filterOptions(), db.taskTemplate.findMany({ orderBy: { name: "asc" } })]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="eyebrow">Create</div><h1 className="page-title mt-1">New task</h1></div>
        {isLead(u) && <Link href="/templates" className="btn">Manage templates</Link>}
      </div>
      <TaskForm
        people={people} departments={departments} meId={u.id} canAssign={isLead(u)}
        templates={templates.map((t) => ({ id: t.id, name: t.name, title: t.title, description: t.description, priority: t.priority, complexity: t.complexity, estimateHours: t.estimateHours, departmentId: t.departmentId, checklist: t.checklist }))}
      />
    </div>
  );
}
