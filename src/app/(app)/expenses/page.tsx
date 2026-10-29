import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { istDateKey } from "@/lib/time";
import { CATEGORY_LABEL, EXPENSE_STATUS_LABEL, inr } from "@/lib/expenses";
import { ClaimActions, ExpenseForm } from "@/components/ExpenseParts";

export const dynamic = "force-dynamic";

const CLS: Record<string, string> = {
  SUBMITTED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", APPROVED: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

export default async function Expenses() {
  const u = await requireUser();
  const founder = isFounder(u);
  const rows = await db.expenseClaim.findMany({ where: founder ? {} : { userId: u.id }, orderBy: { createdAt: "desc" }, take: 200 });
  const names = new Map((await db.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  const sum = (st: string) => rows.filter((r) => r.status === st && (founder || r.userId === u.id)).reduce((s, r) => s + r.amountInr, 0);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><div className="eyebrow">Money back</div><h1 className="page-title mt-1">Expenses</h1><p className="text-sm font-semibold text-mute">Spent your own money on work? Claim it here with a photo of the bill.</p></div>
        {founder && <a href="/api/admin/expenses" className="btn">Download CSV</a>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="stat"><div className="text-2xl font-extrabold">{inr(sum("SUBMITTED"))}</div><div className="text-xs font-bold text-mute">waiting</div></div>
        <div className="stat"><div className="text-2xl font-extrabold">{inr(sum("APPROVED"))}</div><div className="text-xs font-bold text-mute">approved, to pay</div></div>
        <div className="stat"><div className="text-2xl font-extrabold">{inr(sum("PAID"))}</div><div className="text-xs font-bold text-mute">paid</div></div>
      </div>
      <ExpenseForm today={istDateKey()} />
      <h2 className="eyebrow pt-2">{founder ? "All claims" : "My claims"}</h2>
      {rows.length === 0 && <div className="panel p-6 text-center text-sm font-semibold text-mute">No claims yet.</div>}
      {rows.map((r) => (
        <article key={r.id} className="panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><div className="text-lg font-extrabold tracking-tight">{inr(r.amountInr)} <span className="font-semibold text-mute">· {r.title}</span></div>
              <div className="text-xs font-semibold text-mute">{founder && `${names.get(r.userId) ?? ""} · `}{CATEGORY_LABEL[r.category]} · spent {r.spentOn}{r.receiptKey && <> · <a className="text-brand" href={`/api/expenses/${r.id}/receipt`} target="_blank" rel="noopener noreferrer">view receipt</a></>}</div></div>
            <span className={`chip ${CLS[r.status]}`}>{EXPENSE_STATUS_LABEL[r.status]}</span>
          </div>
          {r.notes && <p className="mt-1 text-sm">{r.notes}</p>}
          {r.decisionNote && <p className="mt-1 text-sm font-semibold text-mute">Note: {r.decisionNote}</p>}
          <div className="mt-2"><ClaimActions id={r.id} status={r.status} founder={founder} mine={r.userId === u.id} /></div>
        </article>
      ))}
    </div>
  );
}
