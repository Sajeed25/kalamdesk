"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Item = { id: string; text: string; done: boolean };
type File_ = { id: string; fileName: string; sizeBytes: number; mimeType: string };

export default function ChecklistAndFiles({ taskId, items, files, canEdit }: { taskId: string; items: Item[]; files: File_[]; canEdit: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(url: string, init: RequestInit) {
    const r = await fetch(url, init);
    setErr(r.ok ? "" : ((await r.json().catch(() => ({}))).error ?? "Something went wrong"));
    router.refresh();
    return r.ok;
  }
  const json = (method: string, body: object): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const base = `/api/tasks/${taskId}/checklist`;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim() && (await call(base, json("POST", { text })))) setText("");
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    await call(`/api/tasks/${taskId}/attachments`, { method: "POST", body: fd });
    setBusy(false);
  }

  const done = items.filter((i) => i.done).length;
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 eyebrow">Checklist {items.length > 0 && `· ${done}/${items.length}`}</h2>
        <ul className="space-y-1">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={i.done} disabled={!canEdit} onChange={(e) => call(base, json("PATCH", { itemId: i.id, done: e.target.checked }))} className="h-4 w-4" />
              <span className={i.done ? "text-mute line-through" : ""}>{i.text}</span>
              {canEdit && <button onClick={() => call(base, json("PATCH", { itemId: i.id, remove: true }))} aria-label={`Remove ${i.text}`} className="ml-auto text-xs text-mute hover:text-red-600">✕</button>}
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-mute">No checklist items.</li>}
        </ul>
        {canEdit && (
          <form onSubmit={add} className="mt-2 flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a step…" className="input" />
            <button className="btn">Add</button>
          </form>
        )}
      </section>

      <section>
        <h2 className="mb-2 eyebrow">Attachments · {files.length}</h2>
        <ul className="space-y-1 text-sm">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-xl border border-line p-2">
              {f.mimeType.startsWith("image/") ? (
                <a href={`/api/attachments/${f.id}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${f.fileName}`} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/attachments/${f.id}`} alt={f.fileName} loading="lazy" className="h-14 w-14 rounded-lg object-cover" />
                </a>
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-xs font-extrabold uppercase text-mute">{(f.fileName.split(".").pop() ?? "file").slice(0, 4)}</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{f.fileName}</div>
                <div className="text-xs text-mute">{f.sizeBytes < 1048576 ? `${Math.max(1, Math.round(f.sizeBytes / 1024))} KB` : `${(f.sizeBytes / 1048576).toFixed(1)} MB`}</div>
              </div>
              <a href={`/api/attachments/${f.id}`} target="_blank" rel="noopener noreferrer" className="btn !min-h-0 !py-1 text-xs">{/^(image\/|application\/pdf)/.test(f.mimeType) ? "View" : "Open"}</a>
              <a href={`/api/attachments/${f.id}?download=1`} className="btn !min-h-0 !py-1 text-xs">Download</a>
              {canEdit && <button onClick={() => window.confirm(`Delete ${f.fileName}?`) && call(`/api/attachments/${f.id}`, { method: "DELETE" })} className="text-xs text-mute hover:text-red-600">Delete</button>}
            </li>
          ))}
          {files.length === 0 && <li className="text-mute">No files yet.</li>}
        </ul>
        {canEdit && (
          <label className={`btn mt-2 cursor-pointer ${busy ? "opacity-50" : ""}`}>
            {busy ? "Uploading…" : "Attach file"}
            <input type="file" onChange={upload} disabled={busy} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" />
          </label>
        )}
        <p className="mt-1 text-xs text-mute">Images, PDFs, Office files, CSV. Max 10 MB.</p>
      </section>
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
