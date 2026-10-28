"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PRIORITIES, PRIORITY_CLASS, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from "@/lib/constants";
import { toast } from "@/lib/celebrate";

export type Row = { id: string; title: string; assignees: string; priority: string; status: string; due: string; overdue: boolean };
type Person = { id: string; name: string };

export default function BulkTaskTable({ rows, people, canBulk, sortLinks }: { rows: Row[]; people: Person[]; canBulk: boolean; sortLinks: Record<string, string> }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<"" | "priority" | "status" | "assign" | "due">("");
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"add" | "replace">("add");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ updated: number; failed: { title: string; error: string }[] } | null>(null);
  const [err, setErr] = useState("");

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allOn = sel.size > 0 && sel.size === allIds.length;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function apply() {
    setErr(""); setReport(null);
    const body: Record<string, unknown> = { ids: [...sel], action };
    if (action === "priority") body.priority = value;
    if (action === "status") {
      body.status = value;
      if (value === "BLOCKED") {
        const reason = window.prompt("Why are these blocked? (required)");
        if (!reason?.trim()) return setErr("A reason is required to mark tasks Blocked.");
        body.blockedReason = reason.trim();
      }
    }
    if (action === "assign") { body.userId = value; body.mode = mode; }
    if (action === "due") body.dueAt = value ? new Date(value).toISOString() : null;
    setBusy(true);
    const r = await fetch("/api/tasks/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error ?? d.issues?.[0]?.message ?? "Could not apply");
    setReport(d);
    if (d.updated) toast(`${d.updated} task${d.updated === 1 ? "" : "s"} updated`);
    setSel(new Set());
    router.refresh();
  }

  const th = "px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-mute";
  const ready = action && (action === "due" ? true : !!value);

  return (
    <div className="space-y-3">
      {canBulk && sel.size > 0 && (
        <div role="region" aria-label="Bulk actions" className="panel sticky top-20 z-10 flex flex-wrap items-center gap-3 border-brand/40 p-4">
          <b className="text-sm">{sel.size} selected</b>
          <select value={action} onChange={(e) => { setAction(e.target.value as typeof action); setValue(""); }} className="input !w-44" aria-label="Action">
            <option value="">Choose action…</option><option value="priority">Change priority</option><option value="status">Change status</option><option value="assign">Assign to…</option><option value="due">Set due date</option>
          </select>
          {action === "priority" && <select value={value} onChange={(e) => setValue(e.target.value)} className="input !w-40" aria-label="Priority"><option value="">Pick…</option>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select>}
          {action === "status" && <select value={value} onChange={(e) => setValue(e.target.value)} className="input !w-40" aria-label="Status"><option value="">Pick…</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>}
          {action === "assign" && (
            <>
              <select value={value} onChange={(e) => setValue(e.target.value)} className="input !w-48" aria-label="Person"><option value="">Pick a person…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <select value={mode} onChange={(e) => setMode(e.target.value as "add" | "replace")} className="input !w-44" aria-label="Mode"><option value="add">Add to existing</option><option value="replace">Replace assignees</option></select>
            </>
          )}
          {action === "due" && <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="input !w-56" aria-label="Due date (leave empty to clear)" />}
          <button onClick={apply} disabled={busy || !ready} className="btn btn-primary">{busy ? "Applying…" : "Apply"}</button>
          <button onClick={() => setSel(new Set())} className="btn btn-ghost">Clear</button>
          {err && <span role="alert" className="w-full text-sm font-semibold text-red-600">{err}</span>}
        </div>
      )}
      {report && report.failed.length > 0 && (
        <div role="alert" className="rounded-2xl border border-amber-400/50 bg-amber-400/10 p-4 text-sm font-semibold">
          {report.updated} updated, {report.failed.length} could not be changed:
          <ul className="mt-1 list-disc pl-5">{report.failed.slice(0, 8).map((f, i) => <li key={i}>{f.title}: {f.error}</li>)}</ul>
        </div>
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full text-base">
          <thead className="border-b border-line">
            <tr>
              {canBulk && <th className="w-10 px-3 py-3"><input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(allIds))} aria-label="Select all" className="h-4 w-4" /></th>}
              <th className={th}><Link href={sortLinks.title}>Task</Link></th><th className={th}>Assignee</th>
              <th className={th}><Link href={sortLinks.priority}>Priority</Link></th><th className={th}><Link href={sortLinks.status}>Status</Link></th><th className={th}><Link href={sortLinks.due}>Due</Link></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-b border-line last:border-0 hover:bg-brand/5 ${sel.has(r.id) ? "bg-brand/10" : ""}`}>
                {canBulk && <td className="px-3 py-3"><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.title}`} className="h-4 w-4" /></td>}
                <td className="px-3 py-3"><Link href={`/tasks/${r.id}`} className="font-bold hover:text-brand">{r.title}</Link></td>
                <td className="px-3 py-3 text-sm font-semibold text-mute">{r.assignees}</td>
                <td className="px-3 py-3"><span className={`chip ${PRIORITY_CLASS[r.priority]}`}>{r.priority}</span></td>
                <td className="px-3 py-3 text-sm font-semibold">{STATUS_LABEL[r.status]}</td>
                <td className={`px-3 py-3 text-sm ${r.overdue ? "font-bold text-red-600 dark:text-red-400" : "font-semibold text-mute"}`}>{r.due}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-10 text-center font-semibold text-mute">No tasks match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
