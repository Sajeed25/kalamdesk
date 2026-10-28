import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";
import { teamIds } from "@/lib/tasks";
import { describeRRule, nextOccurrence, parseRRule } from "@/lib/recurrence";
import { ruleAssignees } from "@/lib/recurring";
import { fmtDateTime } from "@/lib/time";
import RecurringManager, { type RuleView } from "@/components/RecurringManager";

export const dynamic = "force-dynamic";

export default async function Recurring() {
  const u = await requireUser();
  if (!isLead(u)) redirect("/my-day");
  const allowed = u.role === "MANAGER" ? [u.id, ...(await teamIds(u.id))] : null;
  const [rulesRaw, people, departments] = await Promise.all([
    db.recurringRule.findMany({ orderBy: [{ active: "desc" }, { title: "asc" }] }),
    db.user.findMany({ where: { active: true, ...(allowed ? { id: { in: allowed } } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ]);
  const names = new Map((await db.user.findMany({ select: { id: true, name: true } })).map((x) => [x.id, x.name]));
  const since = new Date(Date.now() - 90 * 864e5);
  const counts = await db.taskInstance.groupBy({ by: ["ruleId", "outcome"], where: { forDate: { gte: since } }, _count: { _all: true } });
  const count = (ruleId: string, o: string) => counts.find((c) => c.ruleId === ruleId && c.outcome === o)?._count._all ?? 0;

  const rules: RuleView[] = rulesRaw
    .filter((r) => u.role === "FOUNDER" || r.creatorId === u.id || ruleAssignees(r).every((id) => allowed?.includes(id)))
    .map((r) => {
      const spec = parseRRule(r.rrule);
      const next = r.active ? nextOccurrence(r.rrule) : null;
      return {
        id: r.id, title: r.title, description: r.description, active: r.active, schedule: describeRRule(r.rrule),
        next: next ? fmtDateTime(next) : null,
        freq: spec?.freq ?? "WEEKLY", days: spec?.days ?? [], monthDay: spec?.monthDay ?? 1,
        time: spec ? `${String(spec.hour).padStart(2, "0")}:${String(spec.minute).padStart(2, "0")}` : "09:00",
        leadHours: r.leadHours, priority: r.priority, location: r.location ?? "", departmentId: r.departmentId ?? "",
        assigneeIds: ruleAssignees(r), assigneeNames: ruleAssignees(r).map((id) => names.get(id) ?? "?"),
        done: count(r.id, "DONE"), late: count(r.id, "LATE"), missed: count(r.id, "MISSED"),
      };
    });
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="page-title">Recurring activities</h1>
        <p className="text-sm text-mute">Each occurrence is created as a task ahead of time. Not done by the end of its day = missed (counts against the person&apos;s score).</p>
      </div>
      <RecurringManager rules={rules} people={people} departments={departments} />
    </div>
  );
}
