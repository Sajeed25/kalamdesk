import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleWhere } from "@/lib/tasks";
import { fmtDateTime } from "@/lib/time";
import { VISIT_OUTCOMES, kindOf } from "@/lib/visits";

export const dynamic = "force-dynamic";

export default async function Visits() {
  const u = await requireUser();
  const reports = await db.visitReport.findMany({ where: { taskId: { in: (await db.task.findMany({ where: await visibleWhere(u), select: { id: true } })).map((t) => t.id) } }, orderBy: { createdAt: "desc" }, take: 100 });
  const tasks = await db.task.findMany({ where: { id: { in: reports.map((r) => r.taskId) } }, select: { id: true, title: true, location: true, instances: { select: { checkInLat: true, checkInLng: true }, take: 1 } } });
  const people = new Map((await db.user.findMany({ where: { id: { in: reports.map((r) => r.userId) } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  const tmap = new Map(tasks.map((t) => [t.id, t]));
  const weekAgo = Date.now() - 7 * 864e5;
  const week = reports.filter((r) => r.createdAt.getTime() > weekAgo);
  const kids = week.reduce((s, r) => s + (r.attendees ?? 0), 0);
  const workshops = week.filter((r) => r.kind !== "VISIT").length;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div><div className="eyebrow">Field work</div><h1 className="page-title mt-1">Visits, sessions and workshops</h1><p className="text-sm font-semibold text-mute">File a report from the task itself: topics covered, students who attended and how it went. Check-ins with location show a map link.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="stat"><div className="text-3xl font-extrabold">{week.length}</div><div className="text-xs font-bold text-mute">reports this week</div></div>
        <div className="stat"><div className="text-3xl font-extrabold">{workshops}</div><div className="text-xs font-bold text-mute">sessions and workshops</div></div>
        <div className="stat"><div className="text-3xl font-extrabold">{kids}</div><div className="text-xs font-bold text-mute">students reached</div></div>
        <div className="stat"><div className="text-3xl font-extrabold">{week.filter((r) => r.outcome === "NEEDS_FOLLOW_UP" || r.outcome === "PROBLEM").length}</div><div className="text-xs font-bold text-mute">need attention</div></div>
      </div>
      {reports.length === 0 && <div className="panel p-8 text-center text-sm font-semibold text-mute">No reports yet. Open a visit, training or workshop task and fill in the report.</div>}
      {reports.map((r) => {
        const t = tmap.get(r.taskId);
        const o = VISIT_OUTCOMES.find((x) => x.id === r.outcome);
        const inst = t?.instances[0];
        return (
          <article key={r.id} className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/tasks/${r.taskId}`} className="text-lg font-extrabold tracking-tight hover:underline">{t?.title ?? "Visit"}</Link>
              <span className="flex items-center gap-2"><span className="chip bg-ink/10 text-mute">{kindOf(r.kind).short}</span><span className={`chip ${o?.cls}`}>{o?.label}</span></span>
            </div>
            <div className="mt-1 text-xs font-semibold text-mute">{people.get(r.userId) ?? ""} · {fmtDateTime(r.createdAt)}{r.attendees != null ? ` · ${r.attendees} students` : ""}{r.teachers != null ? ` · ${r.teachers} teachers` : ""}{r.grade ? ` · ${r.grade}` : ""}{t?.location ? ` · ${t.location}` : ""}</div>
            {r.topics && <p className="mt-2 text-sm"><b>Topics covered:</b> {r.topics}</p>}
            <p className="mt-2 whitespace-pre-wrap text-sm">{r.summary}</p>
            {r.followUp && <p className="mt-1 text-sm"><b>Follow-up:</b> {r.followUp}</p>}
            {inst?.checkInLat != null && inst.checkInLng != null && <a href={`https://www.google.com/maps?q=${inst.checkInLat},${inst.checkInLng}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-bold text-brand">📍 Open map</a>}
          </article>
        );
      })}
    </div>
  );
}
