"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/lib/celebrate";

/** Founder-only: switch off someone else's 2FA after they lost their phone and codes. Needs the founder's own password (+ code). */
export default function ResetTwoFactor({ userId, name, viewerHas2fa }: { userId: string; name: string; viewerHas2fa: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch(`/api/users/${userId}/2fa-reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, code: code || undefined }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error ?? "Could not reset");
    toast(`Two-step sign-in reset for ${name}`, "info");
    setOpen(false); setPw(""); setCode("");
    router.refresh();
  }
  if (!open) return <button onClick={() => setOpen(true)} className="btn">Reset two-step sign-in</button>;
  return (
    <form onSubmit={submit} className="panel max-w-md space-y-3 p-4">
      <p className="text-sm font-bold">Switch off {name}&apos;s two-step sign-in? They will be told and asked to set it up again.</p>
      <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} className="input" placeholder="Your password" aria-label="Your password" autoComplete="current-password" />
      {viewerHas2fa && <input required value={code} onChange={(e) => setCode(e.target.value)} className="input font-mono tracking-widest" placeholder="Your 6-digit code" aria-label="Your code" autoComplete="one-time-code" />}
      {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      <div className="flex gap-2"><button disabled={busy} className="btn btn-primary">{busy ? "Checking…" : "Reset"}</button><button type="button" onClick={() => setOpen(false)} className="btn">Cancel</button></div>
    </form>
  );
}
