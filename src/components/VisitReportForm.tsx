"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/lib/celebrate";
import { REPORT_KINDS, VISIT_OUTCOMES, guessKind, kindOf } from "@/lib/visits";

export type VisitView = { kind: string; topics: string; grade: string; teachers: number | null; summary: string; attendees: number | null; outcome: string; followUp: string };

/**
 * Report after a school visit, a training session or a workshop: what was covered, how many students came, how it went.
 * Photos: use the Files box on the same page. Tasks that are not field work show it as a collapsed "Add a report" button.
 */
export default function VisitReportForm({ taskId, title, fieldTask, initial }: { taskId: string; title: string; fieldTask: boolean; initial: VisitView | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(!initial && fieldTask);
  const [v, setV] = useState<VisitView>(initial ?? { kind: guessKind(title), topics: "", grade: "", teachers: null, summary: "", attendees: null, outcome: "GOOD", followUp: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const kind = kindOf(v.kind);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await fetch(`/api/tasks/${taskId}/visit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, grade: v.grade || null, attendees: v.attendees ?? null, teachers: v.teachers ?? null }) });
    setBusy(false);
    if (!r.ok) { const d = await r.json().catch(() => ({})); return setErr(d.error ?? d.issues?.[0]?.message ?? "Could not save"); }
    toast(`${kind.label} report saved 🏫`); setOpen(false); router.refresh();
  }

  const cur = VISIT_OUTCOMES.find((o) => o.id === v.outcome);
  if (!open && initial) {
    const k = kindOf(initial.kind);
    return (
      <section className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="eyebrow">{k.label} report</h2><button onClick={() => setOpen(true)} className="text-sm font-bold text-brand">Edit</button></div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className={`chip ${VISIT_OUTCOMES.find((o) => o.id === initial.outcome)?.cls}`}>{VISIT_OUTCOMES.find((o) => o.id === initial.outcome)?.label}</span>
          {initial.attendees != null && <span className="chip bg-line">{initial.attendees} students</span>}
          {initial.teachers != null && <span className="chip bg-line">{initial.teachers} teachers</span>}
          {initial.grade && <span className="chip bg-line">{initial.grade}</span>}
        </div>
        {initial.topics && <p className="mt-2 text-sm"><b>Topics covered:</b> {initial.topics}</p>}
        <p className="mt-2 whitespace-pre-wrap text-sm">{initial.summary}</p>
        {initial.followUp && <p className="mt-2 text-sm"><b>Follow-up:</b> {initial.followUp}</p>}
      </section>
    );
  }
  if (!open) return <button onClick={() => setOpen(true)} className="btn w-fit">+ Add a visit, session or workshop report</button>;

  return (
    <form onSubmit={save} className="panel space-y-4 p-4">
      <div><h2 className="eyebrow">{kind.label} report</h2><p className="text-sm font-semibold text-mute">Two minutes now saves a long call later. Add photos in the Files box below.</p></div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What kind of activity was it?">
        {REPORT_KINDS.map((k) => (
          <button type="button" key={k.id} role="radio" aria-checked={v.kind === k.id} onClick={() => setV({ ...v, kind: k.id })} className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${v.kind === k.id ? "border-brand bg-brand/10 text-brand" : "border-line text-mute hover:border-brand/50"}`}>{k.label}</button>
        ))}
      </div>
      <label className="block text-sm font-medium">Topics covered<textarea rows={2} value={v.topics} onChange={(e) => setV({ ...v, topics: e.target.value })} maxLength={1000} className="input mt-1" placeholder={v.kind === "VISIT" ? "e.g. Robotics demo, 21C Lab overview" : "e.g. Sensors, Arduino basics, line-follower build"} /></label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">Students attended<input type="number" min={0} inputMode="numeric" value={v.attendees ?? ""} onChange={(e) => setV({ ...v, attendees: e.target.value === "" ? null : Number(e.target.value) })} className="input mt-1" /></label>
        <label className="block text-sm font-medium">Teachers present (optional)<input type="number" min={0} inputMode="numeric" value={v.teachers ?? ""} onChange={(e) => setV({ ...v, teachers: e.target.value === "" ? null : Number(e.target.value) })} className="input mt-1" /></label>
        <label className="block text-sm font-medium">Class or grade (optional)<input value={v.grade} onChange={(e) => setV({ ...v, grade: e.target.value })} maxLength={100} className="input mt-1" placeholder="e.g. Grades 6 to 8" /></label>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How did it go?">
        {VISIT_OUTCOMES.map((o) => (
          <button type="button" key={o.id} role="radio" aria-checked={v.outcome === o.id} onClick={() => setV({ ...v, outcome: o.id })} className={`rounded-full border-2 px-4 py-2 text-sm font-extrabold transition ${v.outcome === o.id ? `${o.cls} border-current` : "border-line text-mute hover:border-brand/50"}`}>{o.label}</button>
        ))}
      </div>
      <label className="block text-sm font-medium">What happened?<textarea required rows={4} value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} className="input mt-1" placeholder={`Who you met, what you showed, how students reacted`} /></label>
      <label className="block text-sm font-medium">Follow-up needed (optional)<input value={v.followUp} onChange={(e) => setV({ ...v, followUp: e.target.value })} className="input mt-1" placeholder="Send the proposal by Friday" /></label>
      {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      <div className="flex gap-2"><button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : `Save ${kind.noun} report`}</button>{(initial || !fieldTask) && <button type="button" onClick={() => setOpen(false)} className="btn">Cancel</button>}</div>
      <p className="sr-only">{cur?.label}</p>
    </form>
  );
}
