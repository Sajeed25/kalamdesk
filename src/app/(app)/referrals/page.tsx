import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { programOpen } from "@/lib/referrals";
import { fmtDateTime } from "@/lib/time";
import { ProgramAdmin, StageBar, StatusSelect, SubmitReferral, type ProgramView } from "@/components/ReferralParts";

export const dynamic = "force-dynamic";

export default async function Referrals() {
  const u = await requireUser();
  const founder = isFounder(u);
  const [programs, refs] = await Promise.all([
    db.referralProgram.findMany({ include: { _count: { select: { referrals: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    // Contact details of referred people are only ever loaded for founders and the referrer themselves.
    db.referral.findMany({ where: founder ? {} : { referrerId: u.id }, include: { program: { select: { name: true } }, referrer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  const open = programs.filter((p) => programOpen(p));
  const views: ProgramView[] = programs.map((p) => ({
    id: p.id, name: p.name, reward: p.reward, rewardInr: p.rewardInr, validUntil: p.validUntil ? p.validUntil.toISOString().slice(0, 10) : "", active: p.active, open: programOpen(p), count: p._count.referrals,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-bold">Referrals</h1><p className="text-sm text-mute">Bring in schools, partners or candidates and earn the program reward.</p></div>

      {founder && <ProgramAdmin programs={views} />}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Refer someone</h2>
        {!founder && open.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {open.map((p) => <div key={p.id} className="panel p-3 text-sm"><b>{p.name}</b><div className="text-mute">{p.reward}{p.validUntil && ` · until ${p.validUntil.toISOString().slice(0, 10)}`}</div></div>)}
          </div>
        )}
        <SubmitReferral programs={open.map((p) => ({ id: p.id, name: p.name, reward: p.reward }))} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{founder ? "All referrals" : "Your referrals"} <span className="text-sm font-normal text-mute">({refs.length})</span></h2>
        {refs.map((r) => (
          <div key={r.id} className="panel space-y-2 p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">{r.name}{r.organisation && <span className="font-normal text-mute"> · {r.organisation}</span>}</div>
                <div className="text-xs text-mute">{r.program.name}{founder && ` · from ${r.referrer.name}`} · {fmtDateTime(r.createdAt)}{founder && ` · ${r.contact}`}</div>
                {founder && r.notes && <div className="mt-1 text-mute">{r.notes}</div>}
              </div>
              {founder && <StatusSelect id={r.id} status={r.status} />}
            </div>
            <StageBar status={r.status} />
          </div>
        ))}
        {refs.length === 0 && <div className="panel p-6 text-center text-sm text-mute">{founder ? "No referrals yet." : "You haven't referred anyone yet."}</div>}
      </section>
    </div>
  );
}
