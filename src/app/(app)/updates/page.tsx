import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";
import { teamIds } from "@/lib/tasks";
import { istDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

const shift = (key: string, days: number) => {
  const [y, m, d] = key.split("-").map(Number);
  const n = new Date(Date.UTC(y, m - 1, d + days));
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}-${String(n.getUTCDate()).padStart(2, "0")}`;
};

export default async function Updates({ searchParams }: { searchParams: { date?: string } }) {
  const u = await requireUser();
  if (!isLead(u)) redirect("/update");
  const today = istDateKey();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") ? searchParams.date! : today;
  const scope = u.role === "MANAGER" ? [u.id, ...(await teamIds(u.id))] : null;
  const people = await db.user.findMany({
    where: { active: true, ...(scope ? { id: { in: scope } } : {}) },
    include: { department: true }, orderBy: { name: "asc" },
  });
  const updates = await db.dailyUpdate.findMany({ where: { forDate: date, userId: { in: people.map((p) => p.id) } } });
  const by = new Map(updates.map((x) => [x.userId, x]));
  const missing = people.filter((p) => !by.has(p.id));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="page-title">Stand-ups</h1>
          <p className="text-sm text-mute">{updates.length} of {people.length} submitted for {date}{date === today ? " (today)" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/updates?date=${shift(date, -1)}`} className="btn" aria-label="Previous day">←</Link>
          {date !== today && <Link href="/updates" className="btn">Today</Link>}
          {date < today && <Link href={`/updates?date=${shift(date, 1)}`} className="btn" aria-label="Next day">→</Link>}
        </div>
      </div>

      {missing.length > 0 && (
        <div className="panel border-amber-400/60 p-3 text-sm">
          <b>No update yet:</b> {missing.map((m) => m.name).join(", ")}
        </div>
      )}

      {updates.map((x) => {
        const p = people.find((q) => q.id === x.userId)!;
        return (
          <div key={x.id} className="panel p-4 text-sm">
            <div className="mb-1 flex items-center gap-2 font-semibold">{p.name}<span className="text-xs font-normal text-mute">{p.department?.name}</span></div>
            {x.finished && <p><span className="text-mute">Finished:</span> {x.finished}</p>}
            {x.pending && <p><span className="text-mute">Pending:</span> {x.pending}</p>}
            {x.obstacles && <p className="text-amber-700 dark:text-amber-400"><span className="font-medium">Obstacle:</span> {x.obstacles}</p>}
          </div>
        );
      })}
      {updates.length === 0 && <div className="panel p-8 text-center text-sm text-mute">Nobody has submitted an update for this day.</div>}
    </div>
  );
}
