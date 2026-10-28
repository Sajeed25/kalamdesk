"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishSnapshot({ period }: { period: "week" | "month" }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [emailTeam, setEmailTeam] = useState(false);
  const [done, setDone] = useState<{ url: string; label: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  async function publish() {
    setBusy(true); setErr("");
    const r = await fetch("/api/snapshots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period, emailTeam }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error ?? "Could not publish");
    setDone({ url: `${window.location.origin}/snapshots/${d.slug}`, label: d.label });
    setOpen(false);
  }
  async function copy() {
    if (!done) return;
    try { await navigator.clipboard.writeText(done.url); setCopied(true); } catch { setCopied(false); }
  }

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); setDone(null); }} className="btn">Publish snapshot</button>
      {open && (
        <div className="panel absolute right-0 z-10 mt-2 w-72 space-y-3 p-3 text-sm shadow-xl">
          <p>Freeze this {period === "week" ? "week" : "month"}&apos;s dashboard as a link and PDF for the team. Only signed-in team members can open it.</p>
          <label className="flex items-center gap-2"><input type="checkbox" checked={emailTeam} onChange={(e) => setEmailTeam(e.target.checked)} /> Also email everyone</label>
          {err && <p role="alert" className="text-red-600">{err}</p>}
          <button onClick={publish} disabled={busy} className="btn btn-primary w-full">{busy ? "Publishing…" : "Publish"}</button>
        </div>
      )}
      {done && (
        <div className="panel absolute right-0 z-10 mt-2 w-80 space-y-2 p-3 text-sm shadow-xl">
          <p className="font-medium">Published: {done.label}</p>
          <input readOnly value={done.url} onFocus={(e) => e.currentTarget.select()} className="input text-xs" aria-label="Snapshot link" />
          <div className="flex gap-2"><button onClick={copy} className="btn">{copied ? "Copied ✓" : "Copy link"}</button><a href={done.url} className="btn">Open</a><button onClick={() => setDone(null)} className="btn">Close</button></div>
        </div>
      )}
    </div>
  );
}

export function RevokeSnapshot({ slug, label }: { slug: string; label: string }) {
  const router = useRouter();
  async function revoke() {
    if (!window.confirm(`Remove "${label}"? Its link stops working for everyone.`)) return;
    await fetch(`/api/snapshots/${slug}`, { method: "DELETE" });
    router.refresh();
  }
  return <button onClick={revoke} className="btn">Remove</button>;
}
