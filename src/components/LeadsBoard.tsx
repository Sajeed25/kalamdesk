"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OUTCOMES, OUTCOME_LABEL, STAGES, STAGE_LABEL } from "@/lib/leads";
import { fromIstInputValue, toIstInputValue } from "@/lib/time";
import { confetti, toast } from "@/lib/celebrate";

export type LeadView = {
  id: string; name: string; organisation: string; phone: string; email: string; stage: string; valueInr: number | null;
  nextFollowUp: string | null; notes: string; owner: string; mine: boolean; calls: { id: string; outcome: string; note: string; at: string; by: string }[]; due: boolean;
};

const STAGE_CLS: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", CONTACTED: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  DEMO: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300", PROPOSAL: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  WON: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", LOST: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};
const when = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const post = (url: string, method: string, body: unknown) => fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function AddLead({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({ name: "", organisation: "", phone: "", email: "", source: "", value: "", follow: "", notes: "" });
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const f = v.follow ? fromIstInputValue(v.follow) : null;
    const r = await post("/api/leads", "POST", { name: v.name, organisation: v.organisation, phone: v.phone, email: v.email, source: v.source, valueInr: v.value ? Number(v.value) : null, nextFollowUp: f ? f.toISOString() : null, notes: v.notes });
    if (!r.ok) { const d = await r.json().catch(() => ({})); return setErr(d.issues?.[0]?.message ?? d.error ?? "Could not save"); }
    toast("Lead added 🎯"); router.refresh(); onDone();
  }
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form onSubmit={submit} className="panel grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
      <label className="block text-sm font-medium">Contact name<input required value={v.name} onChange={set("name")} className="input mt-1" /></label>
      <label className="block text-sm font-medium">School / organisation<input value={v.organisation} onChange={set("organisation")} className="input mt-1" /></label>
      <label className="block text-sm font-medium">Phone<input inputMode="tel" value={v.phone} onChange={set("phone")} className="input mt-1" /></label>
      <label className="block text-sm font-medium">Email<input type="email" value={v.email} onChange={set("email")} className="input mt-1" /></label>
      <label className="block text-sm font-medium">Where did it come from?<input value={v.source} onChange={set("source")} className="input mt-1" placeholder="Referral, walk-in, event…" /></label>
      <label className="block text-sm font-medium">Deal size (₹, optional)<input type="number" min={0} value={v.value} onChange={set("value")} className="input mt-1" /></label>
      <label className="block text-sm font-medium sm:col-span-2">Follow up on<input type="datetime-local" value={v.follow} onChange={set("follow")} className="input mt-1" /></label>
      <label className="block text-sm font-medium sm:col-span-2">Notes<textarea rows={2} value={v.notes} onChange={set("notes")} className="input mt-1" /></label>
      {err && <p role="alert" className="text-sm font-semibold text-red-600 sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2"><button className="btn btn-primary">Add lead</button><button type="button" onClick={onDone} className="btn">Cancel</button></div>
    </form>
  );
}

function LeadCard({ l }: { l: LeadView }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<string>("CONNECTED");
  const [note, setNote] = useState("");
  const [follow, setFollow] = useState("");
  const [err, setErr] = useState("");

  async function setStage(stage: string, e?: React.SyntheticEvent) {
    const r = await post(`/api/leads/${l.id}`, "PATCH", { stage });
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Could not update");
    if (stage === "WON") { const b = (e?.currentTarget as HTMLElement | undefined)?.getBoundingClientRect(); confetti(b ? { x: b.left + b.width / 2, y: b.top } : undefined, 70); toast("Deal won! 🎉"); }
    router.refresh();
  }
  async function logCall(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const f = follow ? fromIstInputValue(follow) : null;
    const r = await post(`/api/leads/${l.id}/calls`, "POST", { outcome, note, nextFollowUp: f ? f.toISOString() : null });
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Could not save");
    toast("Call logged 📞"); setNote(""); setFollow(""); setOpen(false); router.refresh();
  }
  async function remove() {
    if (!window.confirm(`Delete the lead "${l.name}" and its call history?`)) return;
    await fetch(`/api/leads/${l.id}`, { method: "DELETE" }); router.refresh();
  }

  return (
    <article className={`panel p-4 ${l.due ? "ring-2 ring-amber-400/70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-lg font-extrabold tracking-tight">{l.name}{l.organisation && <span className="font-semibold text-mute"> · {l.organisation}</span>}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm font-semibold text-mute">
            {l.phone && <a href={`tel:${l.phone.replace(/[^\d+]/g, "")}`} className="text-brand">📞 {l.phone}</a>}
            {l.email && <a href={`mailto:${l.email}`} className="text-brand">✉ {l.email}</a>}
            {l.valueInr != null && <span>₹{l.valueInr.toLocaleString("en-IN")}</span>}
            {!l.mine && <span>Owner: {l.owner}</span>}
          </div>
        </div>
        <span className={`chip ${STAGE_CLS[l.stage]}`}>{STAGE_LABEL[l.stage]}</span>
      </div>
      {l.nextFollowUp && <div className={`mt-2 text-sm font-bold ${l.due ? "text-amber-600" : "text-mute"}`}>{l.due ? "⏰ Follow-up due: " : "Follow up: "}{when(l.nextFollowUp)}</div>}
      {l.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{l.notes}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select aria-label="Stage" value={l.stage} onChange={(e) => setStage(e.target.value, e)} className="input !w-auto !py-1.5 text-sm">{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select>
        <button onClick={() => setOpen(!open)} className="btn btn-primary !py-1.5 text-sm">{open ? "Close" : "📞 Log a call"}</button>
        <button onClick={remove} className="btn !py-1.5 text-sm">Delete</button>
      </div>
      {open && (
        <form onSubmit={logCall} className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-line/40 p-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">How did it go?<select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="input mt-1">{OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}</select></label>
          <label className="block text-sm font-medium">Follow up on (optional)<input type="datetime-local" value={follow} min={toIstInputValue(new Date())} onChange={(e) => setFollow(e.target.value)} className="input mt-1" /></label>
          <label className="block text-sm font-medium sm:col-span-2">Note<input value={note} onChange={(e) => setNote(e.target.value)} className="input mt-1" maxLength={500} placeholder="What was said" /></label>
          <div className="sm:col-span-2"><button className="btn btn-primary">Save call</button></div>
        </form>
      )}
      {err && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{err}</p>}
      {l.calls.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line pt-2 text-xs font-semibold text-mute">
          {l.calls.map((c) => <li key={c.id}>{when(c.at)} · {c.by} · {OUTCOME_LABEL[c.outcome] ?? c.outcome}{c.note ? ` — ${c.note}` : ""}</li>)}
        </ul>
      )}
    </article>
  );
}

export default function LeadsBoard({ leads }: { leads: LeadView[] }) {
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<string>("OPEN");
  const shown = leads.filter((l) => (filter === "ALL" ? true : filter === "OPEN" ? l.stage !== "WON" && l.stage !== "LOST" : filter === "DUE" ? l.due : l.stage === filter));
  const count = (s: string) => leads.filter((l) => l.stage === s).length;
  const tabs: [string, string][] = [["OPEN", `Open (${leads.filter((l) => l.stage !== "WON" && l.stage !== "LOST").length})`], ["DUE", `Follow-up due (${leads.filter((l) => l.due).length})`], ...STAGES.map((s) => [s, `${STAGE_LABEL[s]} (${count(s)})`] as [string, string]), ["ALL", "All"]];
  return (
    <div className="space-y-4">
      {adding ? <AddLead onDone={() => setAdding(false)} /> : <button onClick={() => setAdding(true)} className="btn btn-primary">+ Add a lead</button>}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter leads">
        {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold transition ${filter === id ? "border-brand bg-brand/10 text-brand" : "border-line text-mute hover:border-brand/50"}`}>{label}</button>)}
      </div>
      {shown.length === 0 && <div className="panel p-8 text-center text-sm font-semibold text-mute">{leads.length === 0 ? "No leads yet. Add the first school you are talking to." : "Nothing here."}</div>}
      {shown.map((l) => <LeadCard key={l.id} l={l} />)}
    </div>
  );
}
