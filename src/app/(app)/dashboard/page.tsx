import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isFounder, isLead } from "@/lib/rbac";
import { dashboardData } from "@/lib/dashboard";
import DashboardCharts from "@/components/DashboardCharts";
import { PublishSnapshot } from "@/components/SnapshotButtons";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: { period?: string } }) {
  const u = await requireUser();
  if (!isLead(u)) redirect("/my-day");
  const period = searchParams.period === "month" ? "month" : "week";
  const d = await dashboardData(u, period);
  const k = d.kpis;
  const tiles = [
    { label: "Assigned", value: k.assigned }, { label: "Completed", value: k.completed },
    { label: "On time", value: k.onTimePct === null ? "–" : `${k.onTimePct}%` },
    { label: "Overdue now", value: k.overdueNow, warn: k.overdueNow > 0 }, { label: "Blocked now", value: k.blockedNow, warn: k.blockedNow > 0 },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-mute">{d.label}{u.role === "MANAGER" ? " · your team" : " · whole company"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard?period=week" className={`btn ${period === "week" ? "btn-primary" : ""}`}>Weekly</Link>
          <Link href="/dashboard?period=month" className={`btn ${period === "month" ? "btn-primary" : ""}`}>Monthly</Link>
          <a href={`/api/export/metrics?period=${period}`} className="btn">Export CSV</a>
          {isFounder(u) && <PublishSnapshot period={period} />}
          <Link href="/snapshots" className="btn">Published</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="stat">
            <div className="eyebrow">{t.label}</div>
            <div className={`stat-value mt-2 ${t.warn ? "text-red-600" : ""}`}>{t.value}</div>
          </div>
        ))}
      </div>

      <DashboardCharts d={d} />

      <section className="panel p-4">
        <h2 className="mb-2 text-sm font-semibold">Top performers</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-mute"><tr><th className="py-1">#</th><th>Name</th><th className="text-right">Points</th><th className="text-right">Done</th><th className="text-right">On time</th></tr></thead>
          <tbody>
            {d.top.map((r, i) => (
              <tr key={r.name} className="border-t border-line"><td className="py-1.5 text-mute">{i + 1}</td><td className="font-medium">{r.name}</td><td className="text-right font-semibold">{r.points}</td><td className="text-right">{r.completed}</td><td className="text-right">{r.onTimePct === null ? "–" : `${r.onTimePct}%`}</td></tr>
            ))}
            {d.top.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-mute">No scores yet in this period.</td></tr>}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-mute">Use Publish snapshot to share a frozen copy (link + PDF) with the team.</p>
      </section>
    </div>
  );
}
