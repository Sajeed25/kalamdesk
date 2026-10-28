import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { currentMonthKey, inr, monthSchema, previousMonthKey } from "@/lib/incentives";
import { toIstParts } from "@/lib/time";
import IncentiveAdmin, { type AwardView, type RuleView } from "@/components/IncentiveAdmin";

export const dynamic = "force-dynamic";

const AUD: Record<string, string> = { ALL: "Everyone", EMPLOYEE: "Employees", INTERN: "Interns" };
const summarize = (r: { kind: string; audience: string; minPoints: number; minOnTimePct: number; topN: number | null }) =>
  r.kind === "TOP_N" ? `Top ${r.topN} ${r.topN === 1 ? { ALL: "person", EMPLOYEE: "employee", INTERN: "intern" }[r.audience] : AUD[r.audience].toLowerCase()} by points` : `${AUD[r.audience]}: at least ${r.minPoints} points${r.minOnTimePct ? ` and ${r.minOnTimePct}% on time` : ""}`;

const shiftMonth = (m: string, d: number) => {
  const [y, mo] = m.split("-").map(Number);
  const n = new Date(Date.UTC(y, mo - 1 + d, 1));
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}`;
};

export default async function Incentives({ searchParams }: { searchParams: { month?: string } }) {
  const u = await requireUser();

  if (!isFounder(u)) {
    const [mine, rules] = await Promise.all([
      db.incentiveAward.findMany({ where: { userId: u.id, approved: true }, orderBy: [{ month: "desc" }, { createdAt: "desc" }] }),
      db.incentiveRule.findMany({ where: { active: true }, orderBy: { amountInr: "desc" } }),
    ]);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div><h1 className="page-title">Incentives</h1><p className="text-sm text-mute">Your approved incentives and how they are earned.</p></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="panel p-4"><div className="text-xs uppercase text-mute">Total approved</div><div className="page-title">{inr(mine.reduce((s, a) => s + a.amountInr, 0))}</div></div>
          <div className="panel p-4"><div className="text-xs uppercase text-mute">Paid so far</div><div className="page-title">{inr(mine.filter((a) => a.paid).reduce((s, a) => s + a.amountInr, 0))}</div></div>
        </div>
        <section className="space-y-2">
          <h2 className="eyebrow">Your history</h2>
          {mine.map((a) => (
            <div key={a.id} className="panel flex items-center justify-between gap-3 p-3 text-sm">
              <div><div className="font-medium">{a.month}</div><div className="text-mute">{a.reason}</div></div>
              <div className="text-right"><div className="font-semibold">{inr(a.amountInr)}</div><div className="text-xs text-mute">{a.paid ? "Paid" : "Approved, payment pending"}</div></div>
            </div>
          ))}
          {mine.length === 0 && <div className="panel p-6 text-center text-sm text-mute">Nothing yet. Keep an eye on the rules below.</div>}
        </section>
        <section className="space-y-2">
          <h2 className="eyebrow">How to earn them</h2>
          {rules.map((r) => <div key={r.id} className="panel p-3 text-sm"><b>{r.name}</b> · {inr(r.amountInr)}<div className="text-mute">{summarize(r)}</div></div>)}
          {rules.length === 0 && <p className="text-sm text-mute">No incentive rules are active right now.</p>}
        </section>
      </div>
    );
  }

  // Founder: default to last month during the first 10 days (when review happens), else this month.
  const now = new Date();
  const month = monthSchema.safeParse(searchParams.month).success ? searchParams.month! : toIstParts(now).d <= 10 ? previousMonthKey(now) : currentMonthKey(now);
  const [rules, awards, people] = await Promise.all([
    db.incentiveRule.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.incentiveAward.findMany({ where: { month }, include: { user: { select: { name: true } } }, orderBy: [{ approved: "asc" }, { createdAt: "asc" }] }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const ruleViews: RuleView[] = rules.map((r) => ({ id: r.id, name: r.name, kind: r.kind, audience: r.audience, minPoints: r.minPoints, minOnTimePct: r.minOnTimePct, topN: r.topN, amountInr: r.amountInr, active: r.active, summary: summarize(r) }));
  const awardViews: AwardView[] = awards.map((a) => ({ id: a.id, person: a.user.name, reason: a.reason, amountInr: a.amountInr, approved: a.approved, paid: a.paid, manual: !a.ruleId && !a.referralId }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="page-title">Incentives</h1><p className="text-sm text-mute">Rules decide who is eligible each month. You approve every award before it counts.</p></div>
        <div className="flex items-center gap-2">
          <Link href={`/incentives?month=${shiftMonth(month, -1)}`} className="btn" aria-label="Previous month">←</Link>
          <span className="min-w-20 text-center font-semibold">{month}</span>
          <Link href={`/incentives?month=${shiftMonth(month, 1)}`} className="btn" aria-label="Next month">→</Link>
        </div>
      </div>
      <IncentiveAdmin month={month} rules={ruleViews} awards={awardViews} people={people} />
    </div>
  );
}
