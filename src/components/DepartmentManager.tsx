"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type DeptRow = { id: string; name: string; color: string; people: number; tasks: number };

export default function DepartmentManager({ rows }: { rows: DeptRow[] }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");

  async function call(url: string, method: string, body?: object) {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErr(d.error ?? d.issues?.[0]?.message ?? "Something went wrong");
      return false;
    }
    setErr("");
    router.refresh();
    return true;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await call("/api/departments", "POST", { name, color })) { setName(""); setColor("#64748b"); }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="panel flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm font-medium">New department
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} className="input mt-1 !w-56" placeholder="e.g. Operations" />
        </label>
        <label className="text-sm font-medium">Colour
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 block h-10 w-14 rounded-lg border border-line bg-card p-1" />
        </label>
        <button className="btn btn-primary">Add</button>
      </form>
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}

      <div className="panel divide-y divide-line">
        {rows.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-3 p-3">
            {editing === d.id ? (
              <>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 rounded-lg border border-line bg-card p-1" aria-label="Colour" />
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="input !w-56" aria-label="Name" />
                <button className="btn btn-primary" onClick={async () => (await call(`/api/departments/${d.id}`, "PATCH", { name, color })) && setEditing(null)}>Save</button>
                <button className="btn" onClick={() => { setEditing(null); setErr(""); }}>Cancel</button>
              </>
            ) : (
              <>
                <span className="h-4 w-4 rounded-full" style={{ background: d.color }} aria-hidden />
                <span className="font-medium">{d.name}</span>
                <span className="text-xs text-mute">{d.people} people · {d.tasks} tasks</span>
                <span className="ml-auto flex gap-2">
                  <button className="btn" onClick={() => { setEditing(d.id); setName(d.name); setColor(d.color); setErr(""); }}>Rename / colour</button>
                  <button className="btn" onClick={() => window.confirm(`Delete ${d.name}?`) && call(`/api/departments/${d.id}`, "DELETE")}>Delete</button>
                </span>
              </>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="p-6 text-center text-sm text-mute">No departments yet. Add your first one above.</p>}
      </div>
      <p className="text-xs text-mute">Departments with people or tasks can&apos;t be deleted. Rename them instead, or move the people and tasks first.</p>
    </div>
  );
}
