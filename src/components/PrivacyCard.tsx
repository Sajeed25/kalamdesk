"use client";
import { useState } from "react";
import { toast } from "@/lib/celebrate";

/** DPDP Act rights, in one place: see your data, ask for a correction, ask for deletion. */
export default function PrivacyCard({ isFounder }: { isFounder: boolean }) {
  const [open, setOpen] = useState<"" | "CORRECT" | "DELETE">("");
  const [details, setDetails] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/me/delete-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: open, details }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error ?? d.issues?.[0]?.message ?? "Could not send");
    toast("Request sent to the founders", "info");
    setOpen(""); setDetails("");
  }
  return (
    <div className="panel max-w-md space-y-3 p-5">
      <h2 className="font-extrabold tracking-tight">Your data and privacy</h2>
      <p className="text-sm text-mute">You can see everything the app holds about you, and ask for corrections or deletion at any time.</p>
      <div className="flex flex-wrap gap-2">
        <a href="/api/me/export" className="btn">Download my data</a>
        <button onClick={() => setOpen("CORRECT")} className="btn">Ask for a correction</button>
        <button onClick={() => setOpen("DELETE")} className="btn">Ask for deletion</button>
      </div>
      {open && (
        <form onSubmit={send} className="space-y-2 rounded-2xl border border-line p-3">
          <p className="text-sm font-bold">{open === "DELETE" ? "What would you like deleted, and why?" : "What needs to be corrected?"}</p>
          <textarea required minLength={5} maxLength={500} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} className="input" aria-label="Details" />
          {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
          <div className="flex gap-2"><button disabled={busy} className="btn btn-primary">{busy ? "Sending…" : "Send request"}</button><button type="button" onClick={() => setOpen("")} className="btn">Cancel</button></div>
        </form>
      )}
      {isFounder && <p className="border-t border-line pt-3 text-sm"><a href="/api/admin/export" className="font-bold underline">Export company data (JSON backup copy)</a><span className="block text-xs text-mute">Excludes passwords, 2FA secrets and bank/ID data. Your hosting backups remain the disaster-recovery copy.</span></p>}
    </div>
  );
}
