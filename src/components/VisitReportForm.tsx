"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/lib/celebrate";
import { VISIT_OUTCOMES } from "@/lib/visits";

export type VisitView = { summary: string; attendees: number | null; outcome: string; followUp: string };

/** Short report after a school visit. Photos: use the Files box on the same page. */
export default function VisitReportForm({ taskId, initial }: { taskId: string; initial: VisitView | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(!initial);
  const [v, setV] = useState<VisitView>(initial ?? { summary: "", attendees: null, outcome: "GOOD", followUp: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await fetch(`/api/tasks/${taskId}/visit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, attendees: v.attendees ?? null }) });
    setBusy(false);
    if (!r.ok) { const d = await r.json().catch(() => ({})); return setErr(d.error ?? d.issues?.[0]?.message ?? "Could not save"); }
    toast("Visit report saved 🏫"); setOpen(false); router.refresh();
  }

  const cur = VISIT_OUTCOMES.find((o) => o.id === v.outcome);
  if (!open && initial) {
    return (
      <section className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="eyebrow">Visit report</h2><button onClick={() => setOpen(true)} className="text-sm font-bold text-brand">Edit</button></div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm"><span className={`chip ${cur?.cls}`}>{cur?.label}</span>{initial.attendees != null && <span className="chip bg-line">{initial.attendees} people</span>}</div>
        <p className="mt-2 whitespace-pre-wrap text-sm">{initial.summary}</p>
        {initial.followUp && <p className="mt-2 text-sm"><b>Follow-up:</b> {initial.followUp}</p>}
      </section>
    );
  }
  return (
    <form onSubmit={save} className="panel space-y-4 p-4">
      <div><h2 className="eyebrow">Visit report</h2><p className="text-sm font-semibold text-mute">Two minutes now saves a long call later. Add photos in the Files box below.</p></div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How did it go?">
        {VISIT_OUTCOMES.map((o) => (
          <button type="button" key={o.id} role="radio" aria-checked={v.outcome === o.id} onClick={() => setV({ ...v, outcome: o.id })} className={`rounded-full border-2 px-4 py-2 text-sm font-extrabold transition ${v.outcome === o.id ? `${o.cls} border-current` : "border-line text-mute hover:border-brand/50"}`}>{o.label}</button>
        ))}
      </div>
      <label className="block text-sm font-medium">What happened?<textarea required rows={4} value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} className="input mt-1" placeholder="Who you met, what you showed, how students reacted" /></label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">How many people attended?<input type="number" min={0} value={v.attendees ?? ""} onChange={(e) => setV({ ...v, attendees: e.target.value === "" ? null : Number(e.target.value) })} className="input mt-1" /></label>
        <label className="block text-sm font-medium">Follow-up needed (optional)<input value={v.followUp} onChange={(e) => setV({ ...v, followUp: e.target.value })} className="input mt-1" placeholder="Send the proposal by Friday" /></label>
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      <div className="flex gap-2"><button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : "Save visit report"}</button>{initial && <button type="button" onClick={() => setOpen(false)} className="btn">Cancel</button>}</div>
    </form>
  );
}
