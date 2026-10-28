import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLead } from "@/lib/rbac";
import { deskSummaries } from "@/lib/desk";
import { db } from "@/lib/db";
import { fmtRelative } from "@/lib/time";
import { PriorityChip } from "@/components/TaskRow";

export const dynamic = "force-dynamic";

const DOT = { RED: "bg-red-500", AMBER: "bg-amber-400", GREEN: "bg-emerald-500" } as const;
const ORDER = { RED: 0, AMBER: 1, GREEN: 2 } as const;

export default async function Desk() {
  const u = await requireUser();
  if (!isLead(u)) redirect("/my-day");
  const people = (await deskSummaries(u)).sort((a, b) => ORDER[a.health] - ORDER[b.health] || a.name.localeCompare(b.name));
  const selfInit = await db.task.findMany({
    where: { selfInitiated: true, initiativeAccepted: false, status: { notIn: ["CANCELLED"] } },
    include: { creator: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const count = (h: string) => people.filter((p) => p.health === h).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Founder&apos;s Desk</h1>
          <p className="text-sm text-mute">{people.length} people · {count("RED")} red · {count("AMBER")} amber · {count("GREEN")} green</p>
        </div>
      </div>

      {selfInit.length > 0 && (
        <section className="panel p-3">
          <h2 className="mb-2 text-sm font-semibold">Self-initiated work to review</h2>
          <ul className="space-y-1 text-sm">
            {selfInit.map((t) => (
              <li key={t.id}>
                <Link href={`/tasks/${t.id}`} className="hover:underline"><PriorityChip p={t.priority} /> {t.title}</Link>
                <span className="text-mute"> · {t.creator.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {people.map((p) => (
          <Link key={p.id} href={`/people/${p.id}`} className="panel block p-4 transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 font-bold text-brand">{p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.name} {p.role === "INTERN" && <span className="chip bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">Intern</span>}</div>
                <div className="truncate text-xs text-mute">{p.department ?? "—"} · {p.office}</div>
              </div>
              <span title={p.health} className={`h-3 w-3 rounded-full ${DOT[p.health]}`} aria-label={`Health ${p.health.toLowerCase()}`} />
            </div>
            <div className="mt-3 flex gap-4 text-xs">
              <span><b className={p.overdue ? "text-red-600" : ""}>{p.overdue}</b> overdue</span>
              <span><b className={p.blocked ? "text-amber-600" : ""}>{p.blocked}</b> blocked</span>
              <span><b>{p.openCount}</b> open</span>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {p.today.slice(0, 3).map((t) => (
                <li key={t.id} className="flex items-center gap-2 truncate"><PriorityChip p={t.priority} /><span className="truncate">{t.title}</span></li>
              ))}
              {p.today.length === 0 && <li className="text-xs text-mute">Nothing due today</li>}
              {p.today.length > 3 && <li className="text-xs text-mute">+{p.today.length - 3} more today</li>}
            </ul>
            <div className="mt-3 flex items-center justify-between text-[11px] text-mute"><span>Last activity {fmtRelative(p.lastUpdate)}</span><span className={p.updatedToday ? "text-emerald-700 dark:text-emerald-400" : ""}>{p.updatedToday ? "Stand-up ✓" : "No stand-up yet"}</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
