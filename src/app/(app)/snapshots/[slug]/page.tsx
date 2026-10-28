import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadSnapshot } from "@/lib/snapshots";
import { fmtDateTime } from "@/lib/time";
import DashboardCharts from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

export default async function Snapshot({ params }: { params: { slug: string } }) {
  await requireUser(); // signed-in team members only
  const found = await loadSnapshot(params.slug);
  if (!found) notFound();
  const { snap, payload } = found;
  const d = payload.data;
  const k = d.kpis;
  const tiles = [
    { label: "Assigned", value: k.assigned }, { label: "Completed", value: k.completed },
    { label: "On time", value: k.onTimePct === null ? "–" : `${k.onTimePct}%` },
    { label: "Overdue then", value: k.overdueNow }, { label: "Blocked then", value: k.blockedNow },
  ];
  return (
    <div className="space-y-5">
      <Link href="/snapshots" className="text-sm text-mute hover:underline">← Published dashboards</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{snap.label}</h1>
          <p className="text-sm text-mute">{payload.scope} · a frozen copy published {fmtDateTime(payload.generatedAt)} by {payload.generatedBy}</p>
        </div>
        <a href={`/api/snapshots/${snap.shareSlug}/pdf`} className="btn btn-primary">Download PDF</a>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => <div key={t.label} className="stat"><div className="eyebrow">{t.label}</div><div className="stat-value mt-2">{t.value}</div></div>)}
      </div>
      <DashboardCharts d={d} />
      <section className="panel p-4">
        <h2 className="mb-2 text-sm font-semibold">Top performers</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-mute"><tr><th className="py-1">#</th><th>Name</th><th className="text-right">Points</th><th className="text-right">Done</th><th className="text-right">On time</th></tr></thead>
          <tbody>
            {d.top.map((r, i) => <tr key={r.name} className="border-t border-line"><td className="py-1.5 text-mute">{i + 1}</td><td className="font-medium">{r.name}</td><td className="text-right font-semibold">{r.points}</td><td className="text-right">{r.completed}</td><td className="text-right">{r.onTimePct === null ? "–" : `${r.onTimePct}%`}</td></tr>)}
            {d.top.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-mute">No scores in this period.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
