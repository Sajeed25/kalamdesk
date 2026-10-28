"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/lib/celebrate";

export type DocView = { id: string; kind: string; fileName: string; sizeBytes: number; createdAt: string };
const KIND: Record<string, string> = { OFFER_LETTER: "Offer letter", ID_PROOF: "ID proof", CONTRACT: "Contract", OTHER: "Other" };
const size = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

export default function DocumentsPanel({ userId, docs, encryptionReady }: { userId: string; docs: DocView[]; encryptionReady: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState<{ id: string; name: string } | null>(null);
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);

  async function save(res: Response, name: string) {
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function download(id: string, name: string) {
    setErr("");
    const res = await fetch(`/api/documents/${id}`);
    if (res.status === 401) { setAuth({ id, name }); return; } // needs a fresh password check
    if (!res.ok) return setErr((await res.json().catch(() => ({}))).error ?? "Could not open the document");
    await save(res, name);
  }

  async function reauth(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/auth/reauth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, code: code || undefined }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setBusy(false);
      if (d.needs2fa) setNeedCode(true);
      return setErr(d.error ?? "Could not confirm");
    }
    setPw(""); setCode(""); setNeedCode(false);
    const res = await fetch(`/api/documents/${auth.id}`);
    setBusy(false);
    if (!res.ok) return setErr((await res.json().catch(() => ({}))).error ?? "Could not open the document");
    await save(res, auth.name);
    setAuth(null);
  }

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setErr("");
    const r = await fetch(`/api/people/${userId}/documents`, { method: "POST", body: new FormData(form) });
    setBusy(false);
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Could not upload");
    form.reset();
    toast("Document stored, encrypted 🔒", "info");
    router.refresh();
  }

  async function remove(d: DocView) {
    if (!window.confirm(`Delete ${d.fileName}? This cannot be undone.`)) return;
    const r = await fetch(`/api/documents/${d.id}`, { method: "DELETE" });
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Could not delete");
    router.refresh();
  }

  return (
    <section className="panel space-y-4 p-5">
      <div>
        <h2 className="section-title">Documents</h2>
        <p className="text-sm font-semibold text-mute">Offer letters and ID scans. Files are encrypted before they are stored, only founders can open them, and every open is recorded.</p>
      </div>
      <ul className="space-y-2">
        {docs.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-line/40 px-4 py-3 text-sm">
            <span className="chip bg-brand/15 text-brand">{KIND[d.kind] ?? d.kind}</span>
            <button onClick={() => download(d.id, d.fileName)} className="min-w-0 flex-1 truncate text-left font-bold underline decoration-dotted underline-offset-4 hover:text-brand">{d.fileName}</button>
            <span className="text-xs font-semibold text-mute">{size(d.sizeBytes)} · {new Date(d.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
            <button onClick={() => remove(d)} className="text-xs font-semibold text-mute hover:text-red-600">Delete</button>
          </li>
        ))}
        {docs.length === 0 && <li className="text-sm font-semibold text-mute">No documents yet.</li>}
      </ul>

      {auth && (
        <form onSubmit={reauth} className="space-y-3 rounded-2xl border border-line p-4">
          <p className="text-sm font-bold">Confirm it&apos;s you to open <span className="text-brand">{auth.name}</span></p>
          <input type="password" required autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="input" placeholder="Your password" aria-label="Your password" />
          {needCode && <input required autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className="input font-mono tracking-widest" placeholder="6-digit code" aria-label="Authenticator code" />}
          <div className="flex gap-2"><button disabled={busy} className="btn btn-primary">{busy ? "Checking…" : "Open"}</button><button type="button" onClick={() => { setAuth(null); setPw(""); setCode(""); setNeedCode(false); }} className="btn">Cancel</button></div>
        </form>
      )}

      <form onSubmit={upload} className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr_auto]">
        <select name="kind" required defaultValue="" className="input" aria-label="Document type">
          <option value="" disabled>Type…</option>
          {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt" className="input !py-2.5" aria-label="File" />
        <button disabled={busy || !encryptionReady} className="btn btn-primary">{busy ? "Uploading…" : "Upload"}</button>
      </form>
      {!encryptionReady && <p role="alert" className="text-sm font-semibold text-red-600">Encryption is not set up on the server, so documents cannot be stored.</p>}
      {err && !auth && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      {err && auth && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      <p className="text-xs font-semibold text-mute">PDF, images, Word/Excel/PowerPoint or text. Up to 8 MB each.</p>
    </section>
  );
}
