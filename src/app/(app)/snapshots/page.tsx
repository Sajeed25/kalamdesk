import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { fmtDateTime } from "@/lib/time";
import { RevokeSnapshot } from "@/components/SnapshotButtons";

export const dynamic = "force-dynamic";

export default async function Snapshots() {
  const u = await requireUser();
  // select without the payload: the list only needs titles and dates
  const snaps = await db.dashboardSnapshot.findMany({ select: { id: true, label: true, period: true, shareSlug: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Published dashboards</h1>
        <p className="text-sm text-mute">Frozen copies of the team dashboard, shared by the founders. {isFounder(u) ? "Publish a new one from the Dashboard page." : ""}</p>
      </div>
      {snaps.map((s) => (
        <div key={s.id} className="panel flex flex-wrap items-center justify-between gap-2 p-3">
          <div>
            <Link href={`/snapshots/${s.shareSlug}`} className="font-medium hover:underline">{s.label}</Link>
            <div className="text-xs text-mute">{s.period === "WEEKLY" ? "Weekly" : "Monthly"} · published {fmtDateTime(s.createdAt)}</div>
          </div>
          <div className="flex gap-2">
            <a href={`/api/snapshots/${s.shareSlug}/pdf`} className="btn">PDF</a>
            <Link href={`/snapshots/${s.shareSlug}`} className="btn">Open</Link>
            {isFounder(u) && <RevokeSnapshot slug={s.shareSlug} label={s.label} />}
          </div>
        </div>
      ))}
      {snaps.length === 0 && <div className="panel p-8 text-center text-sm text-mute">Nothing has been published yet.</div>}
    </div>
  );
}
