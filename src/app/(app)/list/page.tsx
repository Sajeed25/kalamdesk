import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";
import { taskInclude } from "@/lib/tasks";
import { filterOptions, filteredWhere, type TaskFilters } from "@/lib/filters";
import { fmtDateTime } from "@/lib/time";
import Filters from "@/components/Filters";
import BulkTaskTable, { type Row } from "@/components/BulkTaskTable";
import { isOverdue } from "@/components/TaskRow";

export const dynamic = "force-dynamic";

type SP = TaskFilters & { sort?: string; dir?: string };
const SORTS: Record<string, string> = { title: "title", priority: "priority", due: "dueAt", status: "status" };

export default async function List({ searchParams }: { searchParams: SP }) {
  const u = await requireUser();
  const sortKey = SORTS[searchParams.sort ?? ""] ?? "dueAt";
  const dir = searchParams.dir === "desc" ? "desc" : "asc";
  const [opts, tasks] = await Promise.all([
    filterOptions(),
    (async () => db.task.findMany({ where: await filteredWhere(u, searchParams), include: taskInclude, orderBy: { [sortKey]: dir }, take: 500 }))(),
  ]);

  const q = (k: string) => {
    const p = new URLSearchParams(Object.entries(searchParams).filter(([, v]) => v) as [string, string][]);
    p.set("sort", k);
    p.set("dir", searchParams.sort === k && dir === "asc" ? "desc" : "asc");
    return `/list?${p}`;
  };
  const rows: Row[] = tasks.map((t) => ({
    id: t.id, title: t.title, assignees: t.assignees.map((a) => a.user.name).join(", "), priority: t.priority, status: t.status,
    due: t.dueAt ? fmtDateTime(t.dueAt) : "", overdue: isOverdue(t),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Everything in one place</div>
          <h1 className="page-title mt-1">All tasks <span className="text-lg font-bold text-mute">({tasks.length})</span></h1>
          {isLead(u) && <p className="text-sm font-semibold text-mute">Tick several tasks to change their priority, status, assignee or due date at once.</p>}
        </div>
        <Filters {...opts} current={searchParams} simple={!isLead(u)} />
      </div>
      <BulkTaskTable rows={rows} people={opts.people} canBulk={isLead(u)} sortLinks={{ title: q("title"), priority: q("priority"), status: q("status"), due: q("due") }} />
    </div>
  );
}
