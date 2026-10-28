"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRIORITIES, PRIORITY_LABEL } from "@/lib/constants";
import { splitChecklist } from "@/lib/templates";

export type TplView = { id: string; name: string; title: string; description: string; priority: string; complexity: number; estimateHours: number | null; departmentId: string; checklist: string; mine: boolean };
type Opt = { id: string; name: string };

function L({ t, children }: { t: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{t}<div className="mt-1">{children}</div></label>;
}

const BLANK: Omit<TplView, "id" | "mine"> = { name: "", title: "", description: "", priority: "P3", complexity: 2, estimateHours: null, departmentId: "", checklist: "" };

function Form({ initial, id, departments, onDone }: { initial: Omit<TplView, "id" | "mine">; id?: string; departments: Opt[]; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = { name: v.name, title: v.title, description: v.description, priority: v.priority, complexity: v.complexity, estimateHours: v.estimateHours, departmentId: v.departmentId || null, checklist: splitChecklist(v.checklist) };
    const r = await fetch(id ? `/api/templates/${id}` : "/api/templates", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); return setErr(d.error ?? d.issues?.[0]?.message ?? "Could not save"); }
    router.refresh(); onDone();
  }
  return (
    <form onSubmit={submit} className="panel grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
      <L t="Template name"><input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="input" placeholder="e.g. Onboard a new school" /></L>
      <L t="Task title it creates"><input required value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} className="input" placeholder="Onboard {school name}" /></L>
      <div className="sm:col-span-2"><L t="Description"><textarea rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className="input" /></L></div>
      <L t="Priority"><select value={v.priority} onChange={(e) => setV({ ...v, priority: e.target.value })} className="input">{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></L>
      <L t="Complexity"><select value={v.complexity} onChange={(e) => setV({ ...v, complexity: Number(e.target.value) })} className="input">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></L>
      <L t="Estimated hours (optional)"><input type="number" min={0} step="0.5" value={v.estimateHours ?? ""} onChange={(e) => setV({ ...v, estimateHours: e.target.value ? Number(e.target.value) : null })} className="input" /></L>
      <L t="Department"><select value={v.departmentId} onChange={(e) => setV({ ...v, departmentId: e.target.value })} className="input"><option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></L>
      <div className="sm:col-span-2"><L t="Checklist (one step per line)"><textarea rows={5} value={v.checklist} onChange={(e) => setV({ ...v, checklist: e.target.value })} className="input" placeholder={"Collect school details\nSign the agreement"} /></L></div>
      {err && <p role="alert" className="text-sm font-semibold text-red-600 sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2"><button className="btn btn-primary">{id ? "Save template" : "Create template"}</button><button type="button" onClick={onDone} className="btn">Cancel</button></div>
    </form>
  );
}

export default function TemplateManager({ templates, departments }: { templates: TplView[]; departments: Opt[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "new" | string>("none");
  async function remove(t: TplView) {
    if (!window.confirm(`Delete the template "${t.name}"? Tasks already created from it are not affected.`)) return;
    await fetch(`/api/templates/${t.id}`, { method: "DELETE" });
    router.refresh();
  }
  return (
    <div className="space-y-4">
      {mode === "new" ? <Form initial={BLANK} departments={departments} onDone={() => setMode("none")} /> : <button onClick={() => setMode("new")} className="btn btn-primary">+ New template</button>}
      {templates.length === 0 && mode !== "new" && <div className="panel p-8 text-center text-sm font-semibold text-mute">No templates yet. Make one for work you repeat: onboarding a school, month-end invoicing, a school-visit checklist.</div>}
      {templates.map((t) => mode === t.id ? (
        <Form key={t.id} id={t.id} initial={t} departments={departments} onDone={() => setMode("none")} />
      ) : (
        <div key={t.id} className="panel flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="text-lg font-extrabold tracking-tight">{t.name}</div>
            <div className="text-sm font-semibold text-mute">Creates “{t.title}” · {t.priority} · complexity {t.complexity}{t.checklist && ` · ${splitChecklist(t.checklist).length} checklist steps`}</div>
          </div>
          {t.mine && <div className="flex gap-2"><button onClick={() => setMode(t.id)} className="btn">Edit</button><button onClick={() => remove(t)} className="btn">Delete</button></div>}
        </div>
      ))}
    </div>
  );
}
