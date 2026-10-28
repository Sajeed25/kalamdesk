"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** The 30-second end-of-day stand-up. Submitting again today replaces the earlier version. */
export default function DailyUpdateForm({ initial, submitted }: { initial: { finished: string; pending: string; obstacles: string }; submitted: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(submitted);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/updates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    setBusy(false);
    if (!res.ok) return setErr((await res.json().catch(() => ({}))).error ?? "Could not save");
    setDone(true);
    router.refresh();
  }
  const F = ({ k, label, hint }: { k: keyof typeof v; label: string; hint: string }) => (
    <label className="block text-sm font-medium">{label}
      <textarea rows={3} maxLength={2000} value={v[k]} onChange={(e) => { setV({ ...v, [k]: e.target.value }); setDone(false); }} placeholder={hint} className="input mt-1" />
    </label>
  );
  return (
    <form onSubmit={submit} className="panel space-y-4 p-4">
      <F k="finished" label="What I finished today" hint="e.g. 20 calls, 2 school visits, invoice for Sunrise School" />
      <F k="pending" label="What is still pending" hint="e.g. 3 follow-ups for tomorrow" />
      <F k="obstacles" label="Any obstacle? (founders are told straight away)" hint="e.g. waiting for GST number from the school" />
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <div className="flex items-center gap-3">
        <button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : done ? "Update again" : "Submit today's update"}</button>
        {done && <span className="text-sm text-emerald-700 dark:text-emerald-400">Submitted for today ✓</span>}
      </div>
    </form>
  );
}
