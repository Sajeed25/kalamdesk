import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";
import { taskInclude, teamIds } from "@/lib/tasks";
import { fmtDateTime } from "@/lib/time";
import TaskRow from "@/components/TaskRow";

export const dynamic = "force-dynamic";

export default async function Person({ params }: { params: { id: string } }) {
  const u = await requireUser();
  if (!isLead(u) && u.id !== params.id) redirect("/my-day");
  // Managers see only themselves and their direct reports (not other teams).
  if (u.role === "MANAGER" && u.id !== params.id && !(await teamIds(u.id)).includes(params.id)) notFound();

  const person = await db.user.findUnique({ where: { id: params.id }, include: { department: true, profile: true } });
  if (!person) notFound();

  const tasks = await db.task.findMany({ where: { assignees: { some: { userId: person.id } } }, include: taskInclude, orderBy: [{ dueAt: "asc" }] });
  const open = tasks.filter((t) => !["DONE", "CANCELLED"].includes(t.status));
  const done = tasks.filter((t) => t.status === "DONE").sort((a, b) => +(b.completedAt ?? 0) - +(a.completedAt ?? 0));
  const history = await db.taskActivity.findMany({ where: { actorId: person.id }, include: { task: { select: { id: true, title: true } } }, orderBy: { createdAt: "desc" }, take: 15 });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{person.name}</h1>
        <p className="text-sm text-mute">{person.profile?.title} · {person.department?.name} · {person.profile?.office}</p>
        {isLead(u) && <p className="text-sm text-mute">{person.email} · {person.profile?.phone ?? "no phone"}</p>}
      </div>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mute">Open · {open.length}</h2>
        {open.map((t) => <TaskRow key={t.id} t={t} />)}
        {open.length === 0 && <p className="text-sm text-mute">No open tasks.</p>}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mute">Recently done · {done.length}</h2>
        {done.slice(0, 5).map((t) => <TaskRow key={t.id} t={t} />)}
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-mute">Recent activity</h2>
        <ul className="space-y-1 text-sm">
          {history.map((h) => (
            <li key={h.id} className="text-mute"><span className="text-ink">{h.task.title}</span> · {h.action.toLowerCase()} {h.detail} · {fmtDateTime(h.createdAt)}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
