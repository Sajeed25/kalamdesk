"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRIORITIES, PRIORITY_LABEL } from "@/lib/constants";
import { fromIstInputValue } from "@/lib/time";

type Person = { id: string; name: string };
export type EditableTask = {
  id: string; title: string; description: string; priority: string; complexity: number;
  dueInput: string; // IST value for datetime-local, "" when none
  assigneeIds: string[];
};

export default function EditTask({ task, people, canAssign }: { task: EditableTask; people: Person[]; canAssign: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [assignees, setAssignees] = useState(task.assigneeIds);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setAssignees((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (canAssign && assignees.length === 0) return setErr("Choose at least one person.");
    const due = String(f.get("due") ?? "");
    const body: Record<string, unknown> = {
      title: f.get("title"),
      description: f.get("description"),
      priority: f.get("priority"),
      complexity: Number(f.get("complexity")),
      dueAt: due ? fromIstInputValue(due)?.toISOString() ?? null : null,
    };
    // Only leads may change who is assigned; for everyone else the field is left alone.
    if (canAssign) body.assigneeIds = assignees;
    setBusy(true); setErr("");
    const res = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) return setErr((await res.json()).error ?? "Could not save");
    setOpen(false);
    router.refresh();
  }

  if (!open) return <button onClick={() => setOpen(true)} className="btn">Edit task</button>;

  const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="block text-sm font-medium">{t}<div className="mt-1">{children}</div></label>;
  return (
    <form onSubmit={submit} className="panel grid gap-4 p-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><L t="Title"><input name="title" required maxLength={200} defaultValue={task.title} className="input" /></L></div>
      <div className="sm:col-span-2"><L t="Description"><textarea name="description" rows={4} defaultValue={task.description} className="input" /></L></div>
      <L t="Priority">
        <select name="priority" defaultValue={task.priority} className="input">{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select>
      </L>
      <L t="Complexity (1–5)">
        <select name="complexity" defaultValue={task.complexity} className="input">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
      </L>
      <div className="sm:col-span-2"><L t="Due (IST) — clear the field to remove the deadline"><input name="due" type="datetime-local" defaultValue={task.dueInput} className="input" /></L></div>
      {canAssign && (
        <fieldset className="sm:col-span-2">
          <legend className="mb-1 text-sm font-medium">Assigned to</legend>
          <div className="grid max-h-44 grid-cols-2 gap-1 overflow-auto rounded-lg border border-line p-2 sm:grid-cols-3">
            {people.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assignees.includes(p.id)} onChange={() => toggle(p.id)} />{p.name}</label>
            ))}
          </div>
        </fieldset>
      )}
      {err && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : "Save changes"}</button>
        <button type="button" onClick={() => { setOpen(false); setErr(""); setAssignees(task.assigneeIds); }} className="btn">Cancel</button>
      </div>
      <p className="text-xs text-mute sm:col-span-2">Assignees are told when the priority or due date changes. Every edit appears in Activity.</p>
    </form>
  );
}
