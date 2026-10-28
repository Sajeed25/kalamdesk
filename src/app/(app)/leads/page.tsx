import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leadWhere } from "@/lib/leadScope";
import LeadsBoard from "@/components/LeadsBoard";

export const dynamic = "force-dynamic";

export default async function Leads() {
  const u = await requireUser();
  const rows = await db.lead.findMany({ where: await leadWhere(u), include: { calls: { orderBy: { createdAt: "desc" }, take: 5 } }, orderBy: [{ updatedAt: "desc" }], take: 500 });
  const names = new Map((await db.user.findMany({ where: { id: { in: [...rows.map((r) => r.ownerId), ...rows.flatMap((r) => r.calls.map((c) => c.userId))] } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  const now = Date.now();
  const open = rows.filter((r) => r.stage !== "WON" && r.stage !== "LOST");
  const pipeline = open.reduce((s, r) => s + (r.valueInr ?? 0), 0);
  const monthAgo = now - 30 * 864e5;
  const won = rows.filter((r) => r.stage === "WON" && r.updatedAt.getTime() > monthAgo);
  const calls = await db.leadCall.count({ where: { lead: await leadWhere(u), createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } });
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div><div className="eyebrow">Sales</div><h1 className="page-title mt-1">Leads</h1><p className="text-sm font-semibold text-mute">{u.role === "EMPLOYEE" || u.role === "INTERN" ? "Your schools and contacts." : "Your team's schools and contacts."} Log every call so nothing is forgotten.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="stat"><div className="text-3xl font-extrabold">{open.length}</div><div className="text-xs font-bold text-mute">open leads</div></div>
        <div className="stat"><div className="text-3xl font-extrabold">₹{pipeline.toLocaleString("en-IN")}</div><div className="text-xs font-bold text-mute">in the pipeline</div></div>
        <div className="stat"><div className="text-3xl font-extrabold">{won.length}</div><div className="text-xs font-bold text-mute">won, last 30 days</div></div>
        <div className="stat"><div className="text-3xl font-extrabold">{calls}</div><div className="text-xs font-bold text-mute">calls this week</div></div>
      </div>
      <LeadsBoard leads={rows.map((r) => ({
        id: r.id, name: r.name, organisation: r.organisation ?? "", phone: r.phone ?? "", email: r.email ?? "", stage: r.stage, valueInr: r.valueInr,
        nextFollowUp: r.nextFollowUp?.toISOString() ?? null, notes: r.notes, owner: names.get(r.ownerId) ?? "", mine: r.ownerId === u.id,
        due: !!r.nextFollowUp && r.nextFollowUp.getTime() <= now && r.stage !== "WON" && r.stage !== "LOST",
        calls: r.calls.map((c) => ({ id: c.id, outcome: c.outcome, note: c.note, at: c.createdAt.toISOString(), by: names.get(c.userId) ?? "" })),
      }))} />
    </div>
  );
}
