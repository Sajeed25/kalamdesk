import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder, isLead } from "@/lib/rbac";
import TemplateManager from "@/components/TemplateManager";

export const dynamic = "force-dynamic";

export default async function Templates() {
  const u = await requireUser();
  if (!isLead(u)) redirect("/tasks/new");
  const [rows, departments] = await Promise.all([db.taskTemplate.findMany({ orderBy: { name: "asc" } }), db.department.findMany({ orderBy: { name: "asc" } })]);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div><div className="eyebrow">Save time</div><h1 className="page-title mt-1">Task templates</h1><p className="text-sm font-semibold text-mute">Everyone can start a task from a template on the New task page. Founders can edit any template; managers edit their own.</p></div>
      <TemplateManager templates={rows.map((t) => ({ id: t.id, name: t.name, title: t.title, description: t.description, priority: t.priority, complexity: t.complexity, estimateHours: t.estimateHours, departmentId: t.departmentId ?? "", checklist: t.checklist, mine: isFounder(u) || t.createdById === u.id }))} departments={departments} />
    </div>
  );
}
