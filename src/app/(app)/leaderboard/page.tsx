import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder, isLead } from "@/lib/rbac";
import { currentRange, inspectableIds, leaderboard, parsePeriod, personMetrics } from "@/lib/metrics";
import { getSettings } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const pct = (v: number | null) => (v === null ? "–" : `${v}%`);
const TABS = [["week", "This week"], ["month", "This month"], ["all", "All time"]] as const;

export default async function Leaderboard({ searchParams }: { searchParams: { period?: string; group?: string; dept?: string } }) {
  const u = await requireUser();
  const period = parsePeriod(searchParams.period);
  const group = searchParams.group === "interns" ? "INTERN" : "EMPLOYEE";
  const range = currentRange(period);
  const [rows, scope, depts, s, mine] = await Promise.all([
    leaderboard(range, group, searchParams.dept || undefined),
    inspectableIds(u),
    db.department.findMany({ orderBy: { name: "asc" } }),
    getSettings(),
    Promise.all((["week", "month", "all"] as const).map(async (p) => (await personMetrics([u.id], currentRange(p))).get(u.id)!)),
  ]);
  const canSee = (id: string) => scope === "all" || scope.has(id);
  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ period, group: group === "INTERN" ? "interns" : "employees", ...(searchParams.dept ? { dept: searchParams.dept } : {}), ...patch });
    return `/leaderboard?${p}`;
  };
  const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-mute";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Scores</h1>
          <p className="text-sm text-mute">Hover a score to see exactly how it was earned.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isLead(u) && <a href={`/api/export/metrics?period=${period}`} className="btn">Export CSV</a>}
          {isFounder(u) && <Link href="/settings/scoring" className="btn">Scoring settings</Link>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["week", "month", "all"] as const).map((p, i) => (
          <div key={p} className="panel p-4">
            <div className="text-xs uppercase tracking-wide text-mute">Your points · {TABS[i][1].toLowerCase()}</div>
            <div className="mt-1 text-3xl font-bold">{mine[i].points}</div>
            <div className="text-xs text-mute">{mine[i].completed} of {mine[i].assigned} tasks done · on time {pct(mine[i].onTimePct)}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(([p, label]) => <Link key={p} href={href({ period: p })} className={`btn ${period === p ? "!bg-brand !text-white" : ""}`}>{label}</Link>)}
        <span className="mx-1 text-line">|</span>
        <Link href={href({ group: "employees" })} className={`btn ${group === "EMPLOYEE" ? "!bg-brand !text-white" : ""}`}>Employees</Link>
        <Link href={href({ group: "interns" })} className={`btn ${group === "INTERN" ? "!bg-brand !text-white" : ""}`}>Interns</Link>
        <form className="ml-auto">
          <input type="hidden" name="period" value={period} />
          <input type="hidden" name="group" value={group === "INTERN" ? "interns" : "employees"} />
          <select name="dept" defaultValue={searchParams.dept ?? ""} className="input !w-40" aria-label="Department">
            <option value="">All departments</option>
            {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="btn ml-2">Filter</button>
        </form>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line">
            <tr>
              <th className={th}>#</th><th className={th}>Name</th><th className={th}>Dept</th>
              <th className={`${th} text-right`}>Points</th>
              <th className={th}>Done</th><th className={th}>On time</th><th className={th}>P1/P2</th>
              <th className={th}>Avg cx</th><th className={th}>Blockers</th><th className={th}>Recurring</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const own = r.userId === u.id;
              const detail = canSee(r.userId);
              return (
                <tr key={r.userId} className={`border-b border-line last:border-0 ${own ? "bg-brand/5" : ""}`}>
                  <td className="px-3 py-2 text-mute">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{r.name}{own && <span className="ml-1 text-xs text-mute">(you)</span>}</td>
                  <td className="px-3 py-2 text-mute">{r.department ?? "–"}</td>
                  <td className="px-3 py-2 text-right font-semibold" title={r.recent.length ? r.recent.join("\n") : "No scoring events in this period"}>
                    <span className="cursor-help border-b border-dotted border-mute">{r.points}</span>
                  </td>
                  {detail ? (
                    <>
                      <td className="px-3 py-2">{r.completed}/{r.assigned}</td>
                      <td className="px-3 py-2">{pct(r.onTimePct)}</td>
                      <td className="px-3 py-2">{pct(r.p12Rate)}</td>
                      <td className="px-3 py-2">{r.avgComplexity ?? "–"}</td>
                      <td className="px-3 py-2">{r.blockers}</td>
                      <td className="px-3 py-2">{pct(r.recurringPct)}</td>
                    </>
                  ) : (
                    <td colSpan={6} className="px-3 py-2 text-xs text-mute">Details are private</td>
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-mute">No one to rank here yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <details className="panel p-4 text-sm">
        <summary className="cursor-pointer font-medium">How points are calculated</summary>
        <div className="mt-3 space-y-2 text-mute">
          <p><b className="text-ink">Per completed task</b> = base points × complexity multiplier × timeliness.</p>
          <p>Base: P1 {s["base.P1"]}, P2 {s["base.P2"]}, P3 {s["base.P3"]}, P4 {s["base.P4"]}. Complexity 1→5 multiplies by {s["cx.1"]}, {s["cx.2"]}, {s["cx.3"]}, {s["cx.4"]}, {s["cx.5"]}.</p>
          <p>Timeliness: on time ×{s["time.onTime"]}, late within 24h ×{s["time.late24"]}, later ×{s["time.lateMore"]}.</p>
          <p>Bonuses: founder impact rating +{s["impact.perStar"]} per star (max 5); self-initiated work accepted by a founder +{s["initiative.bonus"]}.</p>
          <p>Penalties: missed recurring activity −{s["penalty.missedRecurring"]}; open task overdue more than {s["penalty.overdueDays"]} days with no blocker reason −{s["penalty.overdue"]}. <b className="text-ink">Raising a blocker early never costs points.</b></p>
          <p>Employees and managers are ranked together; interns have their own board. Founders are not ranked.</p>
        </div>
      </details>
    </div>
  );
}
