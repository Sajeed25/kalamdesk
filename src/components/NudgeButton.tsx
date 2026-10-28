"use client";
import { useState } from "react";
import { toast } from "@/lib/celebrate";

/** One-click, once-a-day nudge. `endpoint` is /api/people/:id/chase or /api/tasks/:id/chase. */
export default function NudgeButton({ endpoint, label = "Nudge", who }: { endpoint: string; label?: string; who: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function go(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation(); // lives inside clickable cards
    setBusy(true);
    const r = await fetch(endpoint, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setSent(true); toast(`Nudge sent to ${who} 👋`); }
    else toast(d.error ?? "Could not send the nudge", r.status === 409 ? "info" : "error");
  }
  return (
    <button onClick={go} disabled={busy || sent} className="btn !min-h-[2.25rem] !px-3 !text-sm" aria-label={`${label} ${who}`}>
      {sent ? "Nudged ✓" : busy ? "…" : `👋 ${label}`}
    </button>
  );
}
