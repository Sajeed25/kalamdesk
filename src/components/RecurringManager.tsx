"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRIORITIES, PRIORITY_LABEL } from "@/lib/constants";

type Opt = { id: string; name: string };
export type RuleView = {
  id: string; title: string; description: string; active: boolean; schedule: string; next: string | null;
  freq: string; days: number[]; monthDay: number; time: string; leadHours: number; priority: string;
  location: string; departmentId: string; assigneeIds: string[]; assigneeNames: string[];
  done: number; late: number; missed: number;
};

const DAYS = [["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6], ["Sun", 0]] as const;
const BLANK: Omit<RuleView, "id" | "active" | "schedule" | "next" | "assigneeNames" | "done" | "late" | "missed"> = {
  title: "", description: "", freq: "WEEKLY", days: [2], monthDay: 1, time: "10:00", leadHours: 12,
  priority: "P3", location: "", departmentId: "", assigneeIds: [],
};

function RuleForm({ initial, id, people, departments, onDone }: { initial: typeof BLANK; id?: string; people: Opt[]; departments: Opt[]; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch(id ? `/api/recurring/${id}` : "/api/recurring", {
      method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, location: v.location || null, departmentId: v.departmentId || null }),
    });
    setBusy(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); return setErr(d.error ?? d.issues?.[0]?.message ?? "Could not save"); }
    router.refresh();
    onDone();
  }
  const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="block text-sm font-medium">{t}<div className="mt-1">{children}</div></label>;

  return (
    <form onSubmit={submit} className="panel grid gap-4 p-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><L t="Activity"><input required maxLength={200} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} className="input" placeholder="e.g. School visit — training session" /></L></div>
      <L t="Repeats">
        <select value={v.freq} onChange={(e) => setV({ ...v, freq: e.target.value })} className="input">
          <option value="WEEKLY">Weekly on chosen days</option><option value="WEEKDAYS">Every weekday (Mon–Fri)</option>
          <option value="DAILY">Every day</option><option value="MONTHLY">Monthly on a date</option>
        </select>
      </L>
      <L t="At (IST)"><input type="time" required value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} className="input" /></L>
      {v.freq === "WEEKLY" && (
        <fieldset className="sm:col-span-2">
          <legend className="mb-1 text-sm font-medium">On</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(([label, n]) => (
              <label key={n} className={`btn cursor-pointer ${v.days.includes(n) ? "!bg-brand !text-white" : ""}`}>
                <input type="checkbox" className="sr-only" checked={v.days.includes(n)} onChange={() => setV({ ...v, days: toggle(v.days, n) })} />{label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {v.freq === "MONTHLY" && <L t="Day of month (29–31 uses the last day in short months)"><input type="number" min={1} max={31} value={v.monthDay} onChange={(e) => setV({ ...v, monthDay: Number(e.target.value) })} className="input" /></L>}
      <L t="Create the task this many hours before"><input type="number" min={1} max={72} value={v.leadHours} onChange={(e) => setV({ ...v, leadHours: Number(e.target.value) })} className="input" /></L>
      <L t="Priority"><select value={v.priority} onChange={(e) => setV({ ...v, priority: e.target.value })} className="input">{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></L>
      <L t="Location (school name / address)"><input value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} className="input" /></L>
      <L t="Department"><select value={v.departmentId} onChange={(e) => setV({ ...v, departmentId: e.target.value })} className="input"><option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></L>
      <div className="sm:col-span-2"><L t="Notes"><textarea rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className="input" /></L></div>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1 text-sm font-medium">Assigned to (each person gets their own task and is scored separately)</legend>
        <div className="grid max-h-44 grid-cols-2 gap-1 overflow-auto rounded-lg border border-line p-2 sm:grid-cols-3">
          {people.map((p) => <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.assigneeIds.includes(p.id)} onChange={() => setV({ ...v, assigneeIds: toggle(v.assigneeIds, p.id) })} />{p.name}</label>)}
        </div>
      </fieldset>
      {err && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : id ? "Save changes" : "Create recurring activity"}</button>
        <button type="button" onClick={onDone} className="btn">Cancel</button>
      </div>
    </form>
  );
}

export default function RecurringManager({ rules, people, departments }: { rules: RuleView[]; people: Opt[]; departments: Opt[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "new" | string>("none");
  async function toggleActive(r: RuleView) {
    await fetch(`/api/recurring/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !r.active }) });
    router.refresh();
  }
  return (
    <div className="space-y-4">
      {mode === "new" ? (
        <RuleForm initial={BLANK} people={people} departments={departments} onDone={() => setMode("none")} />
      ) : (
        <button onClick={() => setMode("new")} className="btn btn-primary">+ New recurring activity</button>
      )}
      {rules.length === 0 && mode !== "new" && (
        <div className="panel p-8 text-center text-sm text-mute">
          <p className="font-semibold text-ink">No recurring activities yet</p>
          <p className="mt-1">Set up things like “visit school every Tuesday 10:00” or “weekly BD report every Monday”. Each occurrence becomes a task the night before, and anything not done by end of day counts as missed.</p>
        </div>
      )}
      {rules.map((r) =>
        mode === r.id ? (
          <RuleForm key={r.id} id={r.id} initial={r} people={people} departments={departments} onDone={() => setMode("none")} />
        ) : (
          <div key={r.id} className={`panel p-4 ${r.active ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{r.title} {!r.active && <span className="chip bg-line">Paused</span>}</div>
                <div className="text-sm text-mute">{r.schedule}{r.location && ` · ${r.location}`}</div>
                <div className="text-sm text-mute">For {r.assigneeNames.join(", ") || "—"}{r.next && ` · next ${r.next}`}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn" onClick={() => setMode(r.id)}>Edit</button>
                <button className="btn" onClick={() => toggleActive(r)}>{r.active ? "Pause" : "Resume"}</button>
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-mute">
              <span><b className="text-ink">{r.done}</b> done on time</span>
              <span><b className="text-ink">{r.late}</b> late</span>
              <span><b className={r.missed ? "text-red-600" : "text-ink"}>{r.missed}</b> missed</span>
              <span>last 90 days</span>
            </div>
          </div>
        )
      )}
    </div>
  );
}
