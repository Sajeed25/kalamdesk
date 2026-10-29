import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskInclude } from "@/lib/tasks";
import { filterOptions, filteredWhere, type TaskFilters } from "@/lib/filters";
import { fromIst, toIstParts } from "@/lib/time";
import Filters from "@/components/Filters";
import { isLead } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const CHIP: Record<string, string> = {
  P1: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  P2: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  P3: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  P4: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function Calendar({ searchParams }: { searchParams: TaskFilters & { m?: string } }) {
  const u = await requireUser();
  const nowIst = toIstParts(new Date());
  const match = /^(\d{4})-(\d{2})$/.exec(searchParams.m ?? "");
  const y = match ? +match[1] : nowIst.y;
  const mo = match && +match[2] >= 1 && +match[2] <= 12 ? +match[2] - 1 : nowIst.m;

  const from = fromIst(y, mo, 1);
  const to = fromIst(y, mo + 1, 1);
  const [opts, tasks] = await Promise.all([
    filterOptions(),
    (async () =>
      db.task.findMany({
        where: { AND: [await filteredWhere(u, searchParams), { dueAt: { gte: from, lt: to } }, { OR: [{ status: { not: "CANCELLED" } }, { recurringRuleId: { not: null } }] }] },
        include: taskInclude,
        orderBy: [{ dueAt: "asc" }],
      }))(),
  ]);

  const byDay = new Map<number, typeof tasks>();
  for (const t of tasks) {
    const d = toIstParts(t.dueAt!).d;
    byDay.set(d, [...(byDay.get(d) ?? []), t]);
  }

  const daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, mo, 1)).getUTCDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const link = (dm: number) => {
    const d = new Date(Date.UTC(y, mo + dm, 1));
    const p = new URLSearchParams(Object.entries(searchParams).filter(([k, v]) => v && k !== "m") as [string, string][]);
    p.set("m", `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    return `/calendar?${p}`;
  };
  const isToday = (d: number) => y === nowIst.y && mo === nowIst.m && d === nowIst.d;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={link(-1)} className="btn" aria-label="Previous month">←</Link>
          <h1 className="page-title min-w-44 text-center">{MONTHS[mo]} {y}</h1>
          <Link href={link(1)} className="btn" aria-label="Next month">→</Link>
        </div>
        <Filters {...opts} current={searchParams} simple={!isLead(u)} />
      </div>

      <div className="panel overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-line/30 text-center text-xs font-semibold uppercase text-mute">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const items = d ? byDay.get(d) ?? [] : [];
            return (
              <div key={i} className={`min-h-24 border-b border-r border-line p-1 last:border-r-0 ${d ? "" : "bg-line/20"}`}>
                {d && (
                  <>
                    <div className={`mb-1 text-xs ${isToday(d) ? "inline-block rounded-full bg-brand px-1.5 font-bold text-white" : "text-mute"}`}>{d}</div>
                    <div className="space-y-0.5">
                      {items.slice(0, 3).map((t) => (
                        <Link key={t.id} href={`/tasks/${t.id}`} title={`${t.status === "CANCELLED" ? "MISSED: " : ""}${t.title} — ${t.assignees.map((a) => a.user.name).join(", ")}`}
                          className={`block truncate rounded px-1 py-0.5 text-[11px] leading-tight ${CHIP[t.priority]} ${t.status === "DONE" ? "line-through opacity-60" : ""} ${t.status === "CANCELLED" ? "ring-1 ring-red-500/60" : ""}`}>
                          {t.title}
                        </Link>
                      ))}
                      {items.length > 3 && <div className="px-1 text-[11px] text-mute">+{items.length - 3} more</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-mute">Shows tasks by due date (IST). Recurring activities appear here too; a red outline marks one that was missed.</p>
    </div>
  );
}
