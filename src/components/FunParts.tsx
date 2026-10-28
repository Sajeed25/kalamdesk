"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { confetti, toast } from "@/lib/celebrate";

async function post(url: string, body: object) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, error: (d.error ?? d.issues?.[0]?.message) as string | undefined, data: d };
}

/** Inline editor for a weekly goal. "Automatic" removes the override so the goal adapts again. */
export function GoalEditor({ endpoint, goal, custom, min, max, label }: { endpoint: string; goal: number; custom: boolean; min: number; max: number; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(String(goal));
  const [err, setErr] = useState("");

  async function save(value: number | null) {
    setErr("");
    const r = await post(endpoint, { tasks: value });
    if (!r.ok) return setErr(r.error ?? "Could not save");
    setOpen(false);
    toast(value === null ? "Goal is automatic again" : `${label} set to ${value} tasks`, "info");
    router.refresh();
  }

  if (!open)
    return (
      <button onClick={() => { setV(String(goal)); setOpen(true); }} className="text-sm font-bold underline decoration-dotted underline-offset-4 hover:opacity-80">
        Change goal
      </button>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(v);
        if (!Number.isInteger(n) || n < min || n > max) return setErr(`Pick a whole number from ${min} to ${max}`);
        save(n);
      }}
      className="mt-2 flex flex-wrap items-center gap-2"
    >
      <input type="number" min={min} max={max} value={v} onChange={(e) => setV(e.target.value)} className="input !w-24 !py-2 text-ink" aria-label={`${label} (tasks)`} autoFocus />
      <button className="btn btn-primary !min-h-[2.5rem]">Save</button>
      {custom && <button type="button" onClick={() => save(null)} className="btn !min-h-[2.5rem] text-ink">Automatic</button>}
      <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost !min-h-[2.5rem]">Cancel</button>
      {err && <span role="alert" className="w-full text-sm font-semibold text-red-200">{err}</span>}
    </form>
  );
}

const QUICK = ["Great teamwork!", "Saved the day!", "Fast and flawless!", "Thanks for the help!", "Brilliant idea!"];

export function KudosBox({ people }: { people: { id: string; name: string }[] }) {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await post("/api/kudos", { toUserId: to, message: msg });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Could not send");
    confetti();
    toast(`Kudos sent to ${r.data.to} 🙌`);
    setMsg("");
    setTo("");
    router.refresh();
  }
  return (
    <form onSubmit={send} className="space-y-3">
      <select value={to} onChange={(e) => setTo(e.target.value)} required className="input" aria-label="Who deserves kudos?">
        <option value="">Who deserves kudos?</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="flex flex-wrap gap-2" aria-label="Quick messages">
        {QUICK.map((q) => (
          <button key={q} type="button" onClick={() => setMsg(q)} className={`chip !px-3 !py-1.5 transition ${msg === q ? "bg-brand text-white" : "bg-line text-ink hover:bg-brand/15"}`}>{q}</button>
        ))}
      </div>
      <input value={msg} onChange={(e) => setMsg(e.target.value)} required minLength={3} maxLength={140} placeholder="Say it in your own words…" className="input" aria-label="Message" />
      {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      <button disabled={busy || !to || msg.trim().length < 3} className="btn btn-primary">{busy ? "Sending…" : "Send kudos 🙌"}</button>
    </form>
  );
}

/**
 * Celebrates what changed since this device last looked: new badges, and a weekly goal that was reached.
 * State lives in localStorage (per person, per device); the first visit only records, so nobody gets a
 * burst of old badges at once.
 */
export function BadgeWatcher({ userId, earned, goalDone, goalTarget, weekKey }: { userId: string; earned: { id: string; emoji: string; name: string }[]; goalDone: number; goalTarget: number; weekKey: string }) {
  useEffect(() => {
    try {
      const bk = `kd:badges:${userId}`;
      const seen: string[] | null = JSON.parse(localStorage.getItem(bk) ?? "null");
      if (seen) {
        const fresh = earned.filter((e) => !seen.includes(e.id));
        if (fresh.length) {
          confetti(undefined, 60);
          toast(`New badge${fresh.length > 1 ? "s" : ""}: ${fresh.map((f) => `${f.emoji} ${f.name}`).join(", ")}`);
        }
      }
      localStorage.setItem(bk, JSON.stringify(earned.map((e) => e.id)));

      const gk = `kd:goal:${userId}:${weekKey}`;
      if (goalTarget > 0 && goalDone >= goalTarget && !localStorage.getItem(gk)) {
        localStorage.setItem(gk, "1");
        window.setTimeout(() => {
          confetti(undefined, 70);
          toast("Weekly goal smashed! 🎯");
        }, 700);
      }
    } catch {
      /* storage unavailable (private mode): no celebration, nothing breaks */
    }
  }, [userId, earned, goalDone, goalTarget, weekKey]);
  return null;
}
