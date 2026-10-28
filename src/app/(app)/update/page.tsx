import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { istDateKey } from "@/lib/time";
import DailyUpdateForm from "@/components/DailyUpdateForm";

export const dynamic = "force-dynamic";

export default async function Update() {
  const u = await requireUser();
  const today = istDateKey();
  const mine = await db.dailyUpdate.findMany({ where: { userId: u.id }, orderBy: { forDate: "desc" }, take: 8 });
  const todays = mine.find((m) => m.forDate === today);
  const past = mine.filter((m) => m.forDate !== today);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Daily update</h1>
        <p className="text-sm text-mute">Takes about 30 seconds. Founders see who has not updated on the desk.</p>
      </div>
      <DailyUpdateForm initial={{ finished: todays?.finished ?? "", pending: todays?.pending ?? "", obstacles: todays?.obstacles ?? "" }} submitted={!!todays} />
      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="eyebrow">Your recent updates</h2>
          {past.map((p) => (
            <div key={p.id} className="panel p-3 text-sm">
              <div className="mb-1 font-medium">{p.forDate}</div>
              {p.finished && <p><span className="text-mute">Finished:</span> {p.finished}</p>}
              {p.pending && <p><span className="text-mute">Pending:</span> {p.pending}</p>}
              {p.obstacles && <p><span className="text-mute">Obstacle:</span> {p.obstacles}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
