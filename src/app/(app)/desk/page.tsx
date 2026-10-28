import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLead } from "@/lib/rbac";
import { deskSummaries } from "@/lib/desk";
import { db } from "@/lib/db";
import { fmtRelative } from "@/lib/time";
import { PriorityChip } from "@/components/TaskRow";
import Icon from "@/components/Icon";
import NudgeButton from "@/components/NudgeButton";
import CelebrationBanner from "@/components/CelebrationBanner";
import { celebrationsFor } from "@/lib/celebrations";
import { istDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

const ORDER = { RED: 0, AMBER: 1, GREEN: 2 } as const;
const HEALTH = {
  RED: { label: "Needs attention", ring: "ring-red-500", glow: "shadow-[0_0_28px_-4px_rgb(239_68_68/0.55)]", chip: "bg-red-500/15 text-red-600 dark:text-red-400" },
  AMBER: { label: "Keep an eye", ring: "ring-amber-400", glow: "shadow-[0_0_28px_-4px_rgb(251_191_36/0.5)]", chip: "bg-amber-400/20 text-amber-700 dark:text-amber-300" },
  GREEN: { label: "On track", ring: "ring-emerald-500", glow: "shadow-[0_0_28px_-4px_rgb(16_185_129/0.45)]", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
} as const;

export default async function Desk() {
  const u = await requireUser();
  if (!isLead(u)) redirect("/my-day");
  const people = (await deskSummaries(u)).sort((a, b) => ORDER[a.health] - ORDER[b.health] || a.name.localeCompare(b.name));
  const cheers = await celebrationsFor();
  const selfInit = await db.task.findMany({
    where: { selfInitiated: true, initiativeAccepted: false, status: { notIn: ["CANCELLED"] } },
    include: { creator: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const count = (h: string) => people.filter((p) => p.health === h).length;
  const standups = people.filter((p) => p.updatedToday).length;
  const tiles = [
    { label: "Needs attention", value: count("RED"), tone: "text-red-600 dark:text-red-400", bar: "bg-red-500" },
    { label: "Keep an eye", value: count("AMBER"), tone: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
    { label: "On track", value: count("GREEN"), tone: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
    { label: "Stand-ups in", value: `${standups}/${people.length}`, tone: "text-brand", bar: "bg-brand" },
  ];

  return (
    <div className="space-y-7">
      <CelebrationBanner items={cheers} dayKey={istDateKey()} />
      <div>
        <div className="eyebrow">Founder&apos;s Desk</div>
        <h1 className="page-title mt-1">Your team, at a glance</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <div key={t.label} className="panel rise relative overflow-hidden p-5" style={{ ["--i" as string]: i }}>
            <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${t.bar}`} />
            <div className="eyebrow">{t.label}</div>
            <div className={`stat-value mt-2 ${t.tone}`}>{t.value}</div>
          </div>
        ))}
      </div>

      {selfInit.length > 0 && (
        <section className="panel rise p-5 sm:p-6" style={{ ["--i" as string]: 4 }}>
          <h2 className="section-title mb-3 flex items-center gap-2"><Icon name="bolt" className="h-5 w-5 text-brand" />Self-initiated work to review</h2>
          <ul className="space-y-2">
            {selfInit.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 text-base">
                <PriorityChip p={t.priority} />
                <Link href={`/tasks/${t.id}`} className="font-bold hover:text-brand">{t.title}</Link>
                <span className="text-sm font-semibold text-mute">· {t.creator.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {people.map((p, i) => {
          const h = HEALTH[p.health];
          return (
            <div key={p.id} className="panel panel-hover rise relative p-5 sm:p-6" style={{ ["--i" as string]: Math.min(i + 4, 12) }}>
              <Link href={`/people/${p.id}`} className="absolute inset-0 z-0 rounded-3xl" aria-label={`Open ${p.name}`} />
              <div className="pointer-events-none relative flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white ring-4 ring-offset-2 ring-offset-card ${h.ring} ${h.glow}`} style={{ backgroundImage: "linear-gradient(135deg, rgb(var(--grad-a)), rgb(var(--grad-b)))" }}>
                  {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="truncate text-lg font-extrabold tracking-tight">{p.name}</span>{p.role === "INTERN" && <span className="chip bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">Intern</span>}{p.awayUntil && <span className="chip bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">🌴 Away until {p.awayUntil.slice(5)}</span>}</div>
                  <div className="truncate text-sm font-semibold text-mute">{p.department ?? "—"} · {p.office}</div>
                </div>
              </div>

              <div className="pointer-events-none relative mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-line/50 py-2.5"><div className={`text-2xl font-extrabold leading-none ${p.overdue ? "text-red-600 dark:text-red-400" : ""}`}>{p.overdue}</div><div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-mute">Overdue</div></div>
                <div className="rounded-2xl bg-line/50 py-2.5"><div className={`text-2xl font-extrabold leading-none ${p.blocked ? "text-amber-600 dark:text-amber-400" : ""}`}>{p.blocked}</div><div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-mute">Blocked</div></div>
                <div className="rounded-2xl bg-line/50 py-2.5"><div className="text-2xl font-extrabold leading-none">{p.openCount}</div><div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-mute">Open</div></div>
              </div>

              <ul className="pointer-events-none relative mt-4 space-y-2 text-base">
                {p.today.slice(0, 3).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 truncate font-semibold"><PriorityChip p={t.priority} /><span className="truncate">{t.title}</span></li>
                ))}
                {p.today.length === 0 && <li className="text-sm font-semibold text-mute">Nothing due today</li>}
                {p.today.length > 3 && <li className="text-sm font-semibold text-mute">+{p.today.length - 3} more today</li>}
              </ul>

              <div className="relative mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line pt-3 text-xs font-bold">
                <span className={`pointer-events-none chip whitespace-nowrap ${h.chip}`}>{h.label}</span>
                <span className={`pointer-events-none ${p.updatedToday ? "text-emerald-700 dark:text-emerald-400" : "text-mute"}`}>{p.updatedToday ? "Stand-up ✓" : "No stand-up yet"} · {fmtRelative(p.lastUpdate)}</span>
                {(p.overdue > 0 || p.blocked > 0) && p.id !== u.id && <span className="relative z-10 w-full sm:w-auto"><NudgeButton endpoint={`/api/people/${p.id}/chase`} who={p.name} /></span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
