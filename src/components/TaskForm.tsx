"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRIORITIES, PRIORITY_LABEL } from "@/lib/constants";
import { fromIstInputValue } from "@/lib/time";

type Opt = { id: string; name: string };

/** Full task form: the quick-add bar covers the common case, this sets every field. */
function L({ t, children }: { t: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{t}<div className="mt-1">{children}</div></label>;
}

export default function TaskForm({ people, departments, meId, canAssign }: { people: Opt[]; departments: Opt[]; meId: string; canAssign: boolean }) {
  const router = useRouter();
  const [assignees, setAssignees] = useState<string[]>([meId]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setAssignees((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (assignees.length === 0) return setErr("Choose at least one person.");
    const f = new FormData(e.currentTarget);
    const due = fromIstInputValue(String(f.get("due") ?? ""));
    const est = String(f.get("estimate") ?? "");
    setBusy(true); setErr("");
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: f.get("title"),
        description: f.get("description"),
        assigneeIds: assignees,
        departmentId: f.get("department") || null,
        priority: f.get("priority"),
        complexity: Number(f.get("complexity")),
        dueAt: due ? due.toISOString() : null,
        estimateHours: est ? Number(est) : null,
        location: f.get("location") || null,
        tags: f.get("tags") ?? "",
        requiresProof: f.get("proof") === "on",
      }),
    });
    setBusy(false);
    if (!res.ok) return setErr((await res.json()).error ?? "Could not create task");
    router.push(`/tasks/${(await res.json()).task.id}`);
  }


  return (
    <form onSubmit={submit} className="panel grid max-w-3xl gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><L t="Title"><input name="title" required maxLength={200} className="input" autoFocus /></L></div>
      <div className="sm:col-span-2"><L t="Description"><textarea name="description" rows={4} className="input" /></L></div>
      <L t="Priority">
        <select name="priority" defaultValue="P3" className="input">{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select>
      </L>
      <L t="Complexity (1 trivial → 5 very complex)">
        <select name="complexity" defaultValue="2" className="input">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
      </L>
      <L t="Due (IST)"><input name="due" type="datetime-local" className="input" /></L>
      <L t="Estimated effort (hours)"><input name="estimate" type="number" min="0" step="0.5" className="input" /></L>
      <L t="Department">
        <select name="department" className="input"><option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      </L>
      <L t="Location (e.g. school name)"><input name="location" className="input" /></L>
      <L t="Tags (comma separated, optional)"><input name="tags" className="input" /></L>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="proof" /> Require proof before Done</label>

      <fieldset className="sm:col-span-2">
        <legend className="mb-1 text-sm font-medium">{canAssign ? "Assign to" : "For"}</legend>
        <div className="grid max-h-48 grid-cols-2 gap-1 overflow-auto rounded-lg border border-line p-2 sm:grid-cols-3">
          {people.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={assignees.includes(p.id)} onChange={() => toggle(p.id)} />{p.name}{p.id === meId && " (me)"}
            </label>
          ))}
        </div>
        {!canAssign && assignees.some((a) => a !== meId) && <p className="mt-1 text-xs text-mute">Tasks for other people are sent to them as requests from you.</p>}
      </fieldset>

      {err && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{err}</p>}
      <div className="sm:col-span-2"><button disabled={busy} className="btn btn-primary">{busy ? "Creating…" : "Create task"}</button></div>
    </form>
  );
}
