"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type RuleView = { id: string; name: string; kind: string; audience: string; minPoints: number; minOnTimePct: number; topN: number | null; amountInr: number; active: boolean; summary: string };
export type AwardView = { id: string; person: string; reason: string; amountInr: number; approved: boolean; paid: boolean; manual: boolean };

async function call(url: string, method: string, body?: object) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, data: d, error: (d.error ?? d.issues?.[0]?.message) as string | undefined };
}
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function RuleForm({ initial, id, onDone }: { initial: Omit<RuleView, "id" | "summary">; id?: string; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = { name: v.name, kind: v.kind, audience: v.audience, minPoints: Number(v.minPoints), minOnTimePct: Number(v.minOnTimePct), topN: v.kind === "TOP_N" ? Number(v.topN) : null, amountInr: Number(v.amountInr), active: v.active };
    const r = await call(id ? `/api/incentives/rules/${id}` : "/api/incentives/rules", id ? "PATCH" : "POST", body);
    if (!r.ok) return setErr(r.error ?? "Could not save");
    router.refresh();
    onDone();
  }
  const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="block text-xs font-medium text-mute">{t}<div className="mt-1 text-ink">{children}</div></label>;
  return (
    <form onSubmit={submit} className="panel grid gap-3 p-4 sm:grid-cols-3">
      <div className="sm:col-span-3"><L t="Name"><input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="input" placeholder="e.g. Monthly star performer" /></L></div>
      <L t="Type"><select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value, audience: e.target.value === "TOP_N" && v.audience === "ALL" ? "EMPLOYEE" : v.audience })} className="input"><option value="THRESHOLD">Meets targets (points + on-time %)</option><option value="TOP_N">Top N by points</option></select></L>
      <L t="Who"><select value={v.audience} onChange={(e) => setV({ ...v, audience: e.target.value })} className="input">{v.kind === "THRESHOLD" && <option value="ALL">Employees and interns</option>}<option value="EMPLOYEE">Employees and managers</option><option value="INTERN">Interns</option></select></L>
      <L t="Reward per person (₹)"><input type="number" min={1} required value={v.amountInr} onChange={(e) => setV({ ...v, amountInr: Number(e.target.value) })} className="input" /></L>
      {v.kind === "THRESHOLD" ? (
        <>
          <L t="At least this many points in the month"><input type="number" min={0} value={v.minPoints} onChange={(e) => setV({ ...v, minPoints: Number(e.target.value) })} className="input" /></L>
          <L t="At least this on-time % (0 = ignore)"><input type="number" min={0} max={100} value={v.minOnTimePct} onChange={(e) => setV({ ...v, minOnTimePct: Number(e.target.value) })} className="input" /></L>
        </>
      ) : (
        <L t="How many top people get it"><input type="number" min={1} max={20} value={v.topN ?? 3} onChange={(e) => setV({ ...v, topN: Number(e.target.value) })} className="input" /></L>
      )}
      {err && <p role="alert" className="text-sm text-red-600 sm:col-span-3">{err}</p>}
      <div className="flex gap-2 sm:col-span-3"><button className="btn btn-primary">{id ? "Save rule" : "Add rule"}</button><button type="button" onClick={onDone} className="btn">Cancel</button></div>
    </form>
  );
}

const BLANK = { name: "", kind: "THRESHOLD", audience: "ALL", minPoints: 200, minOnTimePct: 90, topN: null as number | null, amountInr: 1000, active: true };

export default function IncentiveAdmin({ month, rules, awards, people }: { month: string; rules: RuleView[]; awards: AwardView[]; people: { id: string; name: string }[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);

  async function calculate() {
    setBusy(true);
    setMsg(null);
    const r = await call("/api/incentives/calculate", "POST", { month });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: r.data.created ? `${r.data.created} new award(s) are waiting for your approval.` : `Nobody new qualifies for ${month} (${r.data.qualifying} already generated).` } : { ok: false, text: r.error ?? "Failed" });
    router.refresh();
  }
  async function act(id: string, action: string) {
    if (action === "reject" && !window.confirm("Reject and remove this award? It will not be generated again.")) return;
    const r = await call(`/api/incentives/awards/${id}`, "PATCH", { action });
    if (!r.ok) setMsg({ ok: false, text: r.error ?? "Failed" });
    router.refresh();
  }
  async function toggleRule(r: RuleView) {
    await call(`/api/incentives/rules/${r.id}`, "PATCH", { active: !r.active });
    router.refresh();
  }
  async function addManual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await call("/api/incentives/awards", "POST", { userId: f.get("userId"), month, amountInr: Number(f.get("amount")), reason: f.get("reason") });
    if (!r.ok) return setMsg({ ok: false, text: r.error ?? "Failed" });
    setManual(false);
    router.refresh();
  }

  const total = (f: (a: AwardView) => boolean) => awards.filter(f).reduce((s, a) => s + a.amountInr, 0);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Rules</h2>
          {editing === null && <button onClick={() => setEditing("new")} className="btn">+ Add rule</button>}
        </div>
        {editing === "new" && <RuleForm initial={BLANK} onDone={() => setEditing(null)} />}
        {rules.length === 0 && editing !== "new" && <p className="panel p-4 text-sm text-mute">No rules yet. Example: “at least 90% on time and 200 points in a month → ₹1,000”, or “top 3 employees → ₹2,000 each”.</p>}
        {rules.map((r) =>
          editing === r.id ? (
            <RuleForm key={r.id} id={r.id} initial={r} onDone={() => setEditing(null)} />
          ) : (
            <div key={r.id} className={`panel flex flex-wrap items-center justify-between gap-2 p-3 ${r.active ? "" : "opacity-60"}`}>
              <div><div className="font-medium">{r.name} {!r.active && <span className="chip bg-line">Paused</span>}</div><div className="text-sm text-mute">{r.summary} → {money(r.amountInr)}</div></div>
              <div className="flex gap-2"><button onClick={() => setEditing(r.id)} className="btn">Edit</button><button onClick={() => toggleRule(r)} className="btn">{r.active ? "Pause" : "Resume"}</button></div>
            </div>
          )
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Awards for {month}</h2>
          <div className="flex gap-2">
            <button onClick={() => setManual(!manual)} className="btn">+ Manual award</button>
            <button onClick={calculate} disabled={busy} className="btn btn-primary">{busy ? "Calculating…" : `Calculate for ${month}`}</button>
          </div>
        </div>
        {msg && <p role="alert" className={`text-sm ${msg.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>{msg.text}</p>}
        {manual && (
          <form onSubmit={addManual} className="panel grid gap-3 p-4 sm:grid-cols-4">
            <select name="userId" required className="input"><option value="">Person…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input name="amount" type="number" min={1} required placeholder="Amount ₹" className="input" />
            <input name="reason" required minLength={3} maxLength={400} placeholder="Reason" className="input sm:col-span-2" />
            <button className="btn btn-primary sm:col-span-4 sm:w-fit">Add (approved)</button>
          </form>
        )}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="panel p-3"><div className="text-xs text-mute">Awaiting approval</div><div className="text-xl font-bold">{money(total((a) => !a.approved))}</div></div>
          <div className="panel p-3"><div className="text-xs text-mute">Approved, unpaid</div><div className="text-xl font-bold">{money(total((a) => a.approved && !a.paid))}</div></div>
          <div className="panel p-3"><div className="text-xs text-mute">Paid</div><div className="text-xl font-bold">{money(total((a) => a.paid))}</div></div>
        </div>
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-mute"><tr><th className="px-3 py-2">Person</th><th className="px-3 py-2">Why</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2" /></tr></thead>
            <tbody>
              {awards.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-medium">{a.person}</td>
                  <td className="px-3 py-2 text-mute">{a.reason}{a.manual && " (manual)"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{money(a.amountInr)}</td>
                  <td className="px-3 py-2">{a.paid ? <span className="chip bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Paid</span> : a.approved ? <span className="chip bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Approved</span> : <span className="chip bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Pending</span>}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {!a.approved && <button onClick={() => act(a.id, "approve")} className="btn btn-primary mr-1">Approve</button>}
                    {a.approved && !a.paid && <button onClick={() => act(a.id, "paid")} className="btn mr-1">Mark paid</button>}
                    {a.paid && <button onClick={() => act(a.id, "unpaid")} className="btn mr-1">Undo paid</button>}
                    {!a.paid && <button onClick={() => act(a.id, "reject")} className="btn">Reject</button>}
                  </td>
                </tr>
              ))}
              {awards.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-mute">No awards for this month yet. Press “Calculate” to see who qualifies.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
