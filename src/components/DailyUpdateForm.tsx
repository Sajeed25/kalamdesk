"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { confetti, toast } from "@/lib/celebrate";

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
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(d.error ?? "Could not save");
    setDone(true);
    confetti();
    toast(d.streak > 1 ? `Stand-up in! ${d.streak}-day streak 🔥` : "Stand-up in! Great start 🔥");
    router.refresh();
  }
  const field = (k: keyof typeof v, label: string, hint: string) => (
    <label className="block text-sm font-medium">{label}
      <textarea rows={3} maxLength={2000} value={v[k]} onChange={(e) => { setV({ ...v, [k]: e.target.value }); setDone(false); }} placeholder={hint} className="input mt-1" />
    </label>
  );
  return (
    <form onSubmit={submit} className="panel space-y-4 p-4">
      {field("finished", "What I finished today", "e.g. 20 calls, 2 school visits, invoice for Sunrise School")}
      {field("pending", "What is still pending", "e.g. 3 follow-ups for tomorrow")}
      {field("obstacles", "Any obstacle? (founders are told straight away)", "e.g. waiting for GST number from the school")}
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <div className="flex items-center gap-3">
        <button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : done ? "Update again" : "Submit today's update"}</button>
        {done && <span className="text-sm text-emerald-700 dark:text-emerald-400">Submitted for today ✓</span>}
      </div>
    </form>
  );
}
