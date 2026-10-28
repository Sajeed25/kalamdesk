"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Field = { key: string; label: string };
const GROUPS: { title: string; hint: string; fields: Field[] }[] = [
  { title: "Base points by priority", hint: "Points a task is worth before multipliers.", fields: ["P1", "P2", "P3", "P4"].map((p) => ({ key: `base.${p}`, label: p })) },
  { title: "Complexity multiplier", hint: "Level 1 (trivial) to 5 (very complex).", fields: [1, 2, 3, 4, 5].map((n) => ({ key: `cx.${n}`, label: `Level ${n}` })) },
  {
    title: "Timeliness factor", hint: "Applied to the task points.",
    fields: [{ key: "time.onTime", label: "Early / on time" }, { key: "time.late24", label: "Late, within 24h" }, { key: "time.lateMore", label: "Late, over 24h" }],
  },
  {
    title: "Bonuses", hint: "Added on top of task points.",
    fields: [{ key: "impact.perStar", label: "Points per impact star (0–5 stars)" }, { key: "initiative.bonus", label: "Initiative bonus (accepted self-initiated task)" }],
  },
  {
    title: "Penalties", hint: "Enter positive numbers; they are subtracted.",
    fields: [{ key: "penalty.missedRecurring", label: "Missed recurring activity" }, { key: "penalty.overdue", label: "Overdue without a blocker reason" }, { key: "penalty.overdueDays", label: "…once overdue by (days)" }],
  },
];

export default function ScoringForm({ values, defaults }: { values: Record<string, number>; defaults: Record<string, number> }) {
  const router = useRouter();
  const [v, setV] = useState<Record<string, string>>(Object.fromEntries(Object.entries(values).map(([k, x]) => [k, String(x)])));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const nums: Record<string, number> = {};
    for (const [k, s] of Object.entries(v)) {
      const n = Number(s);
      if (s.trim() === "" || Number.isNaN(n) || n < 0) return setMsg({ ok: false, text: `Check the value for ${k}: use a number, zero or more.` });
      nums[k] = n;
    }
    setBusy(true);
    const r = await fetch("/api/settings/scoring", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nums) });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Saved. New weights apply to tasks completed from now on." } : { ok: false, text: (await r.json().catch(() => ({}))).error ?? "Could not save" });
    if (r.ok) router.refresh();
  }
  async function reset() {
    if (!window.confirm("Reset every weight to the defaults?")) return;
    const r = await fetch("/api/settings/scoring", { method: "DELETE" });
    if (r.ok) {
      setV(Object.fromEntries(Object.entries(defaults).map(([k, x]) => [k, String(x)])));
      setMsg({ ok: true, text: "Reset to defaults." });
      router.refresh();
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {GROUPS.map((g) => (
        <fieldset key={g.title} className="panel p-4">
          <legend className="px-1 text-sm font-semibold">{g.title}</legend>
          <p className="mb-3 text-xs text-mute">{g.hint}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {g.fields.map((f) => (
              <label key={f.key} className="block text-xs font-medium text-mute">{f.label}
                <input inputMode="decimal" value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} className="input mt-1 text-ink" />
                <span className="mt-0.5 block text-[11px]">default {defaults[f.key]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {msg && <p role="alert" className={`text-sm ${msg.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>{msg.text}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : "Save weights"}</button>
        <button type="button" onClick={reset} className="btn">Reset to defaults</button>
      </div>
    </form>
  );
}
