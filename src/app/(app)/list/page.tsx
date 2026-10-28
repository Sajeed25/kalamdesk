import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskInclude } from "@/lib/tasks";
import { filterOptions, filteredWhere, type TaskFilters } from "@/lib/filters";
import { fmtDateTime } from "@/lib/time";
import { STATUS_LABEL } from "@/lib/constants";
import Filters from "@/components/Filters";
import { PriorityChip, isOverdue } from "@/components/TaskRow";

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
  const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-mute";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">All tasks <span className="text-base font-normal text-mute">({tasks.length})</span></h1>
        <Filters {...opts} current={searchParams} />
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line">
            <tr>
              <th className={th}><Link href={q("title")}>Task</Link></th>
              <th className={th}>Assignee</th>
              <th className={th}><Link href={q("priority")}>Priority</Link></th>
              <th className={th}><Link href={q("status")}>Status</Link></th>
              <th className={th}><Link href={q("due")}>Due</Link></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0 hover:bg-line/30">
                <td className="px-3 py-2"><Link href={`/tasks/${t.id}`} className="font-medium hover:underline">{t.title}</Link></td>
                <td className="px-3 py-2 text-mute">{t.assignees.map((a) => a.user.name).join(", ")}</td>
                <td className="px-3 py-2"><PriorityChip p={t.priority} /></td>
                <td className="px-3 py-2">{STATUS_LABEL[t.status]}</td>
                <td className={`px-3 py-2 ${isOverdue(t) ? "font-semibold text-red-600" : "text-mute"}`}>{fmtDateTime(t.dueAt)}</td>
              </tr>
            ))}
            {tasks.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-mute">No tasks match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
