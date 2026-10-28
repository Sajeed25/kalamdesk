"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WhatsAppPrefs({ configured, phone, optIn }: { configured: boolean; phone: string; optIn: boolean }) {
  const router = useRouter();
  const [p, setP] = useState(phone);
  const [on, setOn] = useState(optIn);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await fetch("/api/me/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: p, whatsappOptIn: on }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: on ? "WhatsApp alerts are on." : "WhatsApp alerts are off." } : { ok: false, text: d.error ?? d.issues?.[0]?.message ?? "Could not save" });
    if (r.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="panel max-w-sm space-y-3 p-5">
      <h2 className="font-semibold">WhatsApp alerts</h2>
      {!configured && <p className="text-xs text-mute">WhatsApp is not switched on for this workspace yet. You can still save your preference.</p>}
      <p className="text-xs text-mute">Get new assignments, blockers, sent-back work and reminders on WhatsApp. Comments and digests stay in the app and email.</p>
      <input value={p} onChange={(e) => setP(e.target.value)} inputMode="tel" placeholder="Mobile number, e.g. 98765 43210" className="input" aria-label="Mobile number" />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-1" />
        <span>I agree to receive KalamDesk alerts on WhatsApp at this number. I can turn this off at any time.</span>
      </label>
      {msg && <p role="alert" className={`text-sm ${msg.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>{msg.text}</p>}
      <button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}
