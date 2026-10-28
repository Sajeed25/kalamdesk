"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STAGES = ["SUBMITTED", "CONTACTED", "QUALIFIED", "CONVERTED", "REWARD_PAID"];
const LABEL: Record<string, string> = { SUBMITTED: "Submitted", CONTACTED: "Contacted", QUALIFIED: "Qualified", CONVERTED: "Converted", REWARD_PAID: "Reward paid" };

async function call(url: string, method: string, body?: object) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, data: d, error: (d.error ?? d.issues?.[0]?.message) as string | undefined };
}

export function StageBar({ status }: { status: string }) {
  const at = STAGES.indexOf(status);
  return (
    <ol className="flex flex-wrap gap-1 text-[11px]" aria-label={`Status: ${LABEL[status]}`}>
      {STAGES.map((s, i) => (
        <li key={s} className={`rounded-full px-2 py-0.5 ${i < at ? "bg-brand/15 text-brand" : i === at ? "bg-brand text-white" : "bg-line text-mute"}`}>{LABEL[s]}</li>
      ))}
    </ol>
  );
}

export function SubmitReferral({ programs }: { programs: { id: string; name: string; reward: string }[] }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true); setErr(""); setOk(false);
    const r = await call("/api/referrals", "POST", { programId: f.get("programId"), name: f.get("name"), contact: f.get("contact"), organisation: f.get("organisation") || null, notes: f.get("notes") ?? "" });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Could not submit");
    form.reset(); setOk(true); router.refresh();
  }
  if (programs.length === 0) return <p className="panel p-4 text-sm text-mute">No referral program is open right now.</p>;
  return (
    <form onSubmit={submit} className="panel grid gap-3 p-4 sm:grid-cols-2">
      <label className="block text-sm font-medium sm:col-span-2">Program
        <select name="programId" required className="input mt-1">{programs.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.reward}</option>)}</select>
      </label>
      <label className="block text-sm font-medium">Who are you referring?<input name="name" required minLength={2} maxLength={100} className="input mt-1" /></label>
      <label className="block text-sm font-medium">Phone or email<input name="contact" required minLength={5} maxLength={150} className="input mt-1" /></label>
      <label className="block text-sm font-medium sm:col-span-2">School / organisation (optional)<input name="organisation" maxLength={150} className="input mt-1" /></label>
      <label className="block text-sm font-medium sm:col-span-2">Notes<textarea name="notes" rows={2} maxLength={2000} className="input mt-1" placeholder="How do you know them? Best time to call?" /></label>
      {err && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{err}</p>}
      {ok && <p className="text-sm text-emerald-700 dark:text-emerald-400 sm:col-span-2">Referral submitted. We&apos;ll keep you posted.</p>}
      <div className="sm:col-span-2"><button disabled={busy} className="btn btn-primary">{busy ? "Submitting…" : "Submit referral"}</button></div>
    </form>
  );
}

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  async function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const r = await call(`/api/referrals/${id}`, "PATCH", { status: e.target.value });
    setErr(r.ok ? "" : r.error ?? "Failed");
    router.refresh();
  }
  return (
    <span>
      <select value={status} onChange={change} className="input !w-auto !py-1 text-xs" aria-label="Referral status">{STAGES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}</select>
      {err && <span role="alert" className="ml-2 text-xs text-red-600">{err}</span>}
    </span>
  );
}

export type ProgramView = { id: string; name: string; reward: string; rewardInr: number | null; validUntil: string; active: boolean; open: boolean; count: number };

function ProgramForm({ initial, id, onDone }: { initial: { name: string; reward: string; rewardInr: number | null; validUntil: string; active: boolean }; id?: string; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await call(id ? `/api/referrals/programs/${id}` : "/api/referrals/programs", id ? "PATCH" : "POST", { name: v.name, reward: v.reward, rewardInr: v.rewardInr || null, validUntil: v.validUntil || null, active: v.active });
    if (!r.ok) return setErr(r.error ?? "Could not save");
    router.refresh(); onDone();
  }
  return (
    <form onSubmit={submit} className="panel grid gap-3 p-4 sm:grid-cols-2">
      <label className="block text-xs font-medium text-mute sm:col-span-2">Program name<input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="input mt-1 text-ink" placeholder="Refer a school for 21C Lab" /></label>
      <label className="block text-xs font-medium text-mute">Reward (as shown to staff)<input required value={v.reward} onChange={(e) => setV({ ...v, reward: e.target.value })} className="input mt-1 text-ink" placeholder="₹2,000 per converted school" /></label>
      <label className="block text-xs font-medium text-mute">Amount credited on conversion (₹, optional)<input type="number" min={1} value={v.rewardInr ?? ""} onChange={(e) => setV({ ...v, rewardInr: e.target.value ? Number(e.target.value) : null })} className="input mt-1 text-ink" /></label>
      <label className="block text-xs font-medium text-mute">Valid until (optional)<input type="date" value={v.validUntil} onChange={(e) => setV({ ...v, validUntil: e.target.value })} className="input mt-1 text-ink" /></label>
      {err && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2"><button className="btn btn-primary">{id ? "Save" : "Open program"}</button><button type="button" onClick={onDone} className="btn">Cancel</button></div>
    </form>
  );
}

export function ProgramAdmin({ programs }: { programs: ProgramView[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  async function toggle(p: ProgramView) { await call(`/api/referrals/programs/${p.id}`, "PATCH", { active: !p.active }); router.refresh(); }
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Programs</h2>{editing === null && <button onClick={() => setEditing("new")} className="btn">+ Open a program</button>}</div>
      {editing === "new" && <ProgramForm initial={{ name: "", reward: "", rewardInr: null, validUntil: "", active: true }} onDone={() => setEditing(null)} />}
      {programs.map((p) => editing === p.id ? (
        <ProgramForm key={p.id} id={p.id} initial={p} onDone={() => setEditing(null)} />
      ) : (
        <div key={p.id} className={`panel flex flex-wrap items-center justify-between gap-2 p-3 ${p.open ? "" : "opacity-60"}`}>
          <div>
            <div className="font-medium">{p.name} {!p.active ? <span className="chip bg-line">Paused</span> : !p.open ? <span className="chip bg-line">Expired</span> : null}</div>
            <div className="text-sm text-mute">{p.reward}{p.validUntil && ` · until ${p.validUntil}`} · {p.count} referral{p.count === 1 ? "" : "s"}</div>
          </div>
          <div className="flex gap-2"><button onClick={() => setEditing(p.id)} className="btn">Edit</button><button onClick={() => toggle(p)} className="btn">{p.active ? "Pause" : "Resume"}</button></div>
        </div>
      ))}
      {programs.length === 0 && editing !== "new" && <p className="panel p-4 text-sm text-mute">No programs yet. Open one, such as “Refer a school for 21C Lab”, “Refer a franchise partner” or “Refer a candidate”.</p>}
    </section>
  );
}
