"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Step = { id: string; label: string; rows: number; bytes: number };
type Data = { sizeBytes: number | null; limitBytes: number; pct: number | null; level: "ok" | "warn" | "approve"; autoRotate: boolean; tables: { name: string; bytes: number }[]; previewJunk: Step[]; previewAuto: Step[] };

const MB = 1024 * 1024;
const size = (b: number) => (b >= 1024 * MB ? `${(b / 1024 / MB).toFixed(2)} GB` : b >= MB ? `${(b / MB).toFixed(b > 100 * MB ? 0 : 1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Database storage for group owners: how full it is, what a clean-up would remove, approve it, or switch on Auto-rotate. */
export default function StoragePanel() {
  const router = useRouter();
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/storage");
    if (r.ok) setD(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(payload: object, label: string) {
    setBusy(label); setMsg(null);
    const r = await fetch("/api/admin/storage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    setBusy("");
    if (!r.ok) { setMsg({ ok: false, text: j.error ?? "Something went wrong" }); return; }
    if (j.result) {
      const removed = (j.result.steps as Step[]).reduce((s, x) => s + x.rows, 0);
      setMsg({ ok: true, text: `Done. ${removed} old item${removed === 1 ? "" : "s"} removed${j.result.after != null ? `; the database is now ${size(j.result.after)}` : ""}.${j.result.stillOver ? " It is still over the limit, so please export what you need and ask your host about more space." : ""}` });
    } else setMsg({ ok: true, text: payload && (payload as { on?: boolean }).on ? "Auto-rotate is on." : "Auto-rotate is off. Clean-ups need your approval again." });
    load();
    router.refresh(); // so the red banner at the top updates too
  }

  if (!d) return <section className="panel p-5"><h2 className="section-title">Storage</h2><p className="mt-2 text-sm text-mute">Checking…</p></section>;
  const pct = d.pct === null ? null : Math.min(100, Math.round(d.pct * 100));
  const bar = d.level === "approve" ? "bg-red-500" : d.level === "warn" ? "bg-amber-500" : "bg-emerald-500";
  const plan = d.previewAuto.filter((s) => s.rows > 0);
  const junk = d.previewJunk.filter((s) => s.rows > 0);

  return (
    <section className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">Storage</h2>
        <span className={`chip ${d.level === "approve" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" : d.level === "warn" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"}`}>
          {d.level === "approve" ? "Approval needed" : d.level === "warn" ? "Getting full" : "Healthy"}
        </span>
      </div>
      {d.sizeBytes === null ? <p className="text-sm text-mute">The host does not report the database size, so usage cannot be shown.</p> : (
        <>
          <div>
            <div className="flex items-end justify-between text-sm font-semibold"><span>{size(d.sizeBytes)} used</span><span className="text-mute">limit {size(d.limitBytes)} · {pct}%</span></div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label="Database storage used"><div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(2, pct ?? 0)}%` }} /></div>
            <p className="mt-1 text-xs text-mute">You are warned at 80%, and asked to approve a clean-up at 90%. Photos and PDFs are the biggest users.</p>
          </div>
          {d.tables.length > 0 && (
            <div className="text-sm"><div className="eyebrow mb-1">Biggest tables</div><ul className="grid gap-1 sm:grid-cols-2">{d.tables.map((t) => <li key={t.name} className="flex justify-between rounded-lg bg-ink/[0.04] px-3 py-1.5"><span>{t.name === "FileBlob" ? "FileBlob (uploaded files)" : t.name}</span><b>{size(t.bytes)}</b></li>)}</ul></div>
          )}
        </>
      )}

      <div className="rounded-2xl border border-line p-4">
        <h3 className="font-bold">{d.level === "approve" ? "Approve a clean-up" : "What a clean-up would remove"}</h3>
        <p className="mt-1 text-sm text-mute">Oldest first, gentlest first, until usage is back under 80%. People, tasks, scores, leave, leads, expense claims and receipts, ID documents, bank details and anything on an open task are <b>never</b> removed.</p>
        {plan.length === 0 ? <p className="mt-2 text-sm font-semibold">Nothing needs to be removed right now.</p> : (
          <ul className="mt-2 space-y-1 text-sm">{plan.map((s) => <li key={s.id} className="flex justify-between gap-3"><span>{s.label}</span><b className="shrink-0">{s.rows}{s.bytes >= MB ? ` · ${size(s.bytes)}` : ""}</b></li>)}</ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {d.level !== "ok" && <button disabled={!!busy} onClick={() => window.confirm("Approve this clean-up? The items listed are deleted for good. Download any backup you need first.") && post({ action: "approve" }, "approve")} className={`btn ${d.level === "approve" ? "btn-primary" : ""}`}>{busy === "approve" ? "Cleaning…" : "Approve clean-up"}</button>}
          <button disabled={!!busy || junk.length === 0} onClick={() => post({ action: "junk" }, "junk")} className="btn">{busy === "junk" ? "Cleaning…" : `Remove only the junk${junk.length ? ` (${junk.reduce((s, x) => s + x.rows, 0)})` : ""}`}</button>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-line p-4 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={d.autoRotate} disabled={!!busy} onChange={(e) => post({ action: "auto", on: e.target.checked }, "auto")} />
        <span><b>Auto-rotate (overwrite the oldest).</b> Let KalamDesk make room by itself when storage reaches 90%, always removing the <b>oldest</b> attachments and records first, so new uploads take the place of the oldest ones. Off by default: with it off, nothing is ever deleted without your approval. Every clean-up is written to the audit log and the group owners are told.</span>
      </label>
      {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}
