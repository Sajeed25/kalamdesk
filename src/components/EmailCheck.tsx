"use client";
import { useState } from "react";

type Result = {
  ok: boolean; reason?: string; sentTo?: string;
  status?: { mode: string; hostSet: boolean; userSet: boolean; passwordSet: boolean; fromSet: boolean; port: number; userLooksLikeEmail: boolean; userHasQuotesOrSpaces: boolean; passwordHasQuotesOrSpaces: boolean; fromMatchesUser: boolean };
};

export default function EmailCheck() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true); setErr(""); setRes(null);
    const r = await fetch("/api/admin/test-email", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error ?? "Could not run the test");
    setRes(d);
  }
  const yes = (v: boolean | undefined) => (v ? "✓ set" : "✗ missing");
  return (
    <div className="panel max-w-md space-y-3 p-5">
      <h2 className="font-extrabold tracking-tight">Email check</h2>
      <p className="text-sm text-mute">Sends one test message to your own address and tells you exactly what is wrong if it fails.</p>
      <button onClick={run} disabled={busy} className="btn btn-primary">{busy ? "Sending…" : "Send test email"}</button>
      {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      {res && (
        <div role="status" className={`rounded-2xl p-4 text-sm font-semibold ${res.ok ? "bg-good/10 text-good" : "bg-red-500/10 text-red-700 dark:text-red-300"}`}>
          {res.ok ? `Sent to ${res.sentTo}. Check your inbox (and spam folder).` : res.reason}
        </div>
      )}
      {res?.status && (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-semibold text-mute">
          <li>Mode: <b className="text-ink">{res.status.mode === "smtp" ? "real email" : "log only"}</b></li>
          <li>Port: <b className="text-ink">{res.status.port}</b></li>
          <li>SMTP_HOST: {yes(res.status.hostSet)}</li>
          <li>SMTP_USER: {yes(res.status.userSet)}</li>
          <li>SMTP_PASSWORD: {yes(res.status.passwordSet)}</li>
          <li>EMAIL_FROM: {yes(res.status.fromSet)}</li>
        </ul>
      )}
      {res?.status && !res.ok && (
        <ul className="space-y-1 text-xs font-bold">
          {!res.status.userLooksLikeEmail && <li className="text-amber-700 dark:text-amber-300">⚠ SMTP_USER does not look like a full email address (it needs the @yourdomain part).</li>}
          {res.status.userHasQuotesOrSpaces && <li className="text-amber-700 dark:text-amber-300">⚠ SMTP_USER has a space or quote mark in it. Remove it.</li>}
          {res.status.passwordHasQuotesOrSpaces && <li className="text-amber-700 dark:text-amber-300">⚠ SMTP_PASSWORD starts or ends with a space or quote mark. Remove it.</li>}
          {!res.status.fromMatchesUser && <li className="text-amber-700 dark:text-amber-300">⚠ EMAIL_FROM does not contain the SMTP_USER address. Hostinger needs them to match.</li>}
          {res.status.userLooksLikeEmail && !res.status.userHasQuotesOrSpaces && !res.status.passwordHasQuotesOrSpaces && res.status.fromMatchesUser && <li className="font-semibold text-mute">The values look well-formed, so the password itself is probably wrong. Try signing in to this mailbox in Hostinger webmail with the same password.</li>}
        </ul>
      )}
    </div>
  );
}
