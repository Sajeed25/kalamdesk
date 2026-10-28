import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskInclude } from "@/lib/tasks";
import { filterOptions, filteredWhere, type TaskFilters } from "@/lib/filters";
import Filters from "@/components/Filters";
import KanbanBoard, { type BoardTask } from "@/components/KanbanBoard";
import { isOverdue } from "@/components/TaskRow";

export const dynamic = "force-dynamic";

export default async function Board({ searchParams }: { searchParams: TaskFilters }) {
  const u = await requireUser();
  const [opts, tasks] = await Promise.all([
    filterOptions(),
    (async () =>
      db.task.findMany({
        where: {
          AND: [
            await filteredWhere(u, searchParams),
            // keep the Done column useful but short: only the last 7 days
            { OR: [{ status: { notIn: ["DONE", "CANCELLED"] } }, { status: "DONE", completedAt: { gte: new Date(Date.now() - 7 * 864e5) } }] },
          ],
        },
        include: taskInclude,
        orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
        take: 300,
      }))(),
  ]);

  const initial: BoardTask[] = tasks.map((t) => ({
    id: t.id, title: t.title, priority: t.priority, status: t.status, dueAt: t.dueAt?.toISOString() ?? null,
    overdue: isOverdue(t), requiresProof: t.requiresProof, selfInitiated: t.selfInitiated,
    assignees: t.assignees.map((a) => a.user.name), blockedReason: t.blockedReason,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Board</h1>
        <Filters {...opts} current={searchParams} />
      </div>
      {initial.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-mute">No tasks match these filters.</div>
      ) : (
        <KanbanBoard key={JSON.stringify(searchParams) + initial.map((t) => t.id + t.status).join()} initial={initial} />
      )}
    </div>
  );
}
