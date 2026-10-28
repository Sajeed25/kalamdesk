import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskInclude } from "@/lib/tasks";
import { endOfIstDay } from "@/lib/time";
import TaskRow from "@/components/TaskRow";

export const dynamic = "force-dynamic";

export default async function MyDay() {
  const u = await requireUser();
  const open = await db.task.findMany({
    where: { assignees: { some: { userId: u.id } }, status: { notIn: ["DONE", "CANCELLED"] } },
    include: taskInclude,
    orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
  });
  const now = new Date();
  const end = endOfIstDay(now);
  const overdue = open.filter((t) => t.dueAt && t.dueAt < now);
  const today = open.filter((t) => t.dueAt && t.dueAt >= now && t.dueAt <= end);
  const upcoming = open.filter((t) => !t.dueAt || t.dueAt > end);

  const groups = [
    { label: "Overdue", items: overdue, tone: "text-red-600" },
    { label: "Due today", items: today, tone: "" },
    { label: "Upcoming", items: upcoming, tone: "text-mute" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Day</h1>
        <p className="text-sm text-mute">Hi {u.name.split(" ")[0]} — {overdue.length + today.length} need attention today. Press <kbd className="rounded border border-line px-1">N</kbd> to add a task.</p>
      </div>
      {open.length === 0 && (
        <div className="panel p-8 text-center">
          <p className="text-lg font-semibold">Nothing on your plate 🎉</p>
          <p className="mt-1 text-sm text-mute">Log what you plan to do today with “+ New task” — it shows up on the founders&apos; desk as self-initiated work.</p>
        </div>
      )}
      {groups.map((g) =>
        g.items.length ? (
          <section key={g.label} className="space-y-2">
            <h2 className={`text-sm font-semibold uppercase tracking-wide ${g.tone}`}>{g.label} · {g.items.length}</h2>
            {g.items.map((t) => <TaskRow key={t.id} t={t} />)}
          </section>
        ) : null
      )}
    </div>
  );
}
