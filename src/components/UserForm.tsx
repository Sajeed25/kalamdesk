"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OFFICES, ROLES } from "@/lib/constants";

export type UserFormValues = {
  id?: string; name: string; email: string; role: string; departmentId: string; office: string; title: string;
  phone: string; personalEmail: string; emergencyContact: string; employmentType: string; managerId: string;
  joinedOn: string; internStart: string; internEnd: string; active: boolean;
};

export const EMPTY_USER: UserFormValues = {
  name: "", email: "", role: "EMPLOYEE", departmentId: "", office: "Hyderabad", title: "", phone: "", personalEmail: "",
  emergencyContact: "", employmentType: "FULL_TIME", managerId: "", joinedOn: "", internStart: "", internEnd: "", active: true,
};

export default function UserForm({ initial, departments, managers }: { initial: UserFormValues; departments: { id: string; name: string }[]; managers: { id: string; name: string }[] }) {
  const router = useRouter();
  const editing = !!initial.id;
  const [v, setV] = useState(initial);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof UserFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setV((p) => ({
      ...p, [k]: val,
      // picking Intern as role implies an intern employment type
      ...(k === "role" ? { employmentType: val === "INTERN" ? "INTERN" : p.employmentType === "INTERN" ? "FULL_TIME" : p.employmentType } : {}),
    }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setNote("");
    const { id, email, active, ...rest } = v;
    const body = editing ? { ...rest, active } : { ...rest, email };
    const res = await fetch(editing ? `/api/users/${id}` : "/api/users", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) return setErr((await res.json()).error ?? "Could not save");
    if (editing) { setNote("Saved."); router.refresh(); }
    else router.push("/people");
  }
  async function resend() {
    const res = await fetch(`/api/users/${initial.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resendInvite: true }) });
    setNote(res.ok ? "Invite sent." : "Could not send invite.");
  }

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block text-sm font-medium">{label}<div className="mt-1">{children}</div></label>;

  return (
    <form onSubmit={submit} className="panel grid max-w-3xl gap-4 p-5 sm:grid-cols-2">
      <F label="Full name"><input required value={v.name} onChange={set("name")} className="input" /></F>
      <F label="Official email">
        <input required type="email" value={v.email} onChange={set("email")} disabled={editing} className="input disabled:opacity-60" />
      </F>
      <F label="Role">
        <select value={v.role} onChange={set("role")} className="input">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
      </F>
      <F label="Department">
        <select value={v.departmentId} onChange={set("departmentId")} className="input">
          <option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </F>
      <F label="Job title"><input value={v.title} onChange={set("title")} className="input" /></F>
      <F label="Office">
        <select value={v.office} onChange={set("office")} className="input">{OFFICES.map((o) => <option key={o}>{o}</option>)}</select>
      </F>
      <F label="Employment type">
        <select value={v.employmentType} onChange={set("employmentType")} className="input">
          <option value="FULL_TIME">Full-time</option><option value="INTERN">Intern</option><option value="CONTRACT">Contract</option>
        </select>
      </F>
      <F label="Reports to">
        <select value={v.managerId} onChange={set("managerId")} className="input">
          <option value="">—</option>{managers.filter((m) => m.id !== v.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </F>
      <F label="Phone"><input value={v.phone} onChange={set("phone")} className="input" /></F>
      <F label="Personal email"><input type="email" value={v.personalEmail} onChange={set("personalEmail")} className="input" /></F>
      <F label="Emergency contact"><input value={v.emergencyContact} onChange={set("emergencyContact")} className="input" placeholder="Name, relation, phone" /></F>
      <F label="Date of joining"><input type="date" value={v.joinedOn} onChange={set("joinedOn")} className="input" /></F>
      {v.employmentType === "INTERN" && (
        <>
          <F label="Internship start"><input type="date" value={v.internStart} onChange={set("internStart")} className="input" /></F>
          <F label="Internship end"><input type="date" value={v.internEnd} onChange={set("internEnd")} className="input" /></F>
        </>
      )}
      {editing && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> Active (untick to deactivate — they can no longer sign in)
        </label>
      )}
      {!editing && <p className="text-xs text-mute sm:col-span-2">They&apos;ll get an email with a link to set their own password. Bank and ID details are not collected here.</p>}
      {err && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{err}</p>}
      {note && <p className="text-sm text-emerald-600 sm:col-span-2">{note}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={busy} className="btn btn-primary">{editing ? "Save changes" : "Add person & send invite"}</button>
        {editing && <button type="button" onClick={resend} className="btn">Resend invite / reset link</button>}
      </div>
    </form>
  );
}
