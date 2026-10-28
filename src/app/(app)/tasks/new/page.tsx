import { requireUser } from "@/lib/auth";
import { isLead } from "@/lib/rbac";
import { filterOptions } from "@/lib/filters";
import TaskForm from "@/components/TaskForm";

export default async function NewTask() {
  const u = await requireUser();
  const { people, departments } = await filterOptions();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New task</h1>
      <TaskForm people={people} departments={departments} meId={u.id} canAssign={isLead(u)} />
    </div>
  );
}
