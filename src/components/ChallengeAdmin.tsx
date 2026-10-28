"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { METRICS, METRIC_LABEL } from "@/lib/challengeMeta";
import { toast } from "@/lib/celebrate";

export function NewChallenge({ today }: { today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ title: "", description: "", metric: "TASKS_DONE", target: "50", startsOn: today, endsOn: today, prize: "" });
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/challenges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, target: Number(v.target) }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); return setErr(d.issues?.[0]?.message ?? d.error ?? "Could not create"); }
    toast("Challenge launched 🚀"); setOpen(false); router.refresh();
  }
  if (!open) return <button onClick={() => setOpen(true)} className="btn btn-primary">+ Launch a seasonal challenge</button>;
  return (
    <form onSubmit={submit} className="panel grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
      <label className="block text-sm font-medium sm:col-span-2">Title<input required value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} className="input mt-1" placeholder="Diwali sprint: 100 tasks before the lamps are lit" /></label>
      <label className="block text-sm font-medium">What counts?<select value={v.metric} onChange={(e) => setV({ ...v, metric: e.target.value })} className="input mt-1">{METRICS.map((m) => <option key={m} value={m}>{METRIC_LABEL[m]}</option>)}</select></label>
      <label className="block text-sm font-medium">Team target<input type="number" required min={1} value={v.target} onChange={(e) => setV({ ...v, target: e.target.value })} className="input mt-1" /></label>
      <label className="block text-sm font-medium">Starts<input type="date" required value={v.startsOn} onChange={(e) => setV({ ...v, startsOn: e.target.value, endsOn: e.target.value > v.endsOn ? e.target.value : v.endsOn })} className="input mt-1" /></label>
      <label className="block text-sm font-medium">Ends<input type="date" required min={v.startsOn} value={v.endsOn} onChange={(e) => setV({ ...v, endsOn: e.target.value })} className="input mt-1" /></label>
      <label className="block text-sm font-medium sm:col-span-2">Prize or reward (optional)<input value={v.prize} onChange={(e) => setV({ ...v, prize: e.target.value })} className="input mt-1" placeholder="Team lunch, extra half-day" /></label>
      <label className="block text-sm font-medium sm:col-span-2">A line to inspire (optional)<input value={v.description} maxLength={500} onChange={(e) => setV({ ...v, description: e.target.value })} className="input mt-1" /></label>
      {err && <p role="alert" className="text-sm font-semibold text-red-600 sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2"><button className="btn btn-primary">Launch</button><button type="button" onClick={() => setOpen(false)} className="btn">Cancel</button></div>
    </form>
  );
}

export function ChallengeButtons({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  async function toggle() { await fetch(`/api/challenges/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) }); router.refresh(); }
  async function remove() { if (!window.confirm("Delete this challenge?")) return; await fetch(`/api/challenges/${id}`, { method: "DELETE" }); router.refresh(); }
  return <div className="flex gap-2"><button onClick={toggle} className="btn !py-1 text-xs">{active ? "End now" : "Bring back"}</button><button onClick={remove} className="btn !py-1 text-xs">Delete</button></div>;
}
