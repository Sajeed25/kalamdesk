"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ORG_COLORS } from "@/lib/orgColors";

export type OrgCard = { id: string; name: string; tagline: string; color: string; active: boolean; home: boolean; current: boolean; people: number; openTasks: number; founders: string[] };
export type OwnerRow = { id: string; name: string; email: string; allOrgs: boolean; org: string; me: boolean };

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Brand colour">
      {ORG_COLORS.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} onClick={() => onChange(c)}
          className={`h-8 w-8 rounded-full border-2 transition ${value === c ? "scale-110 border-ink" : "border-transparent hover:scale-105"}`} style={{ background: c }} />
      ))}
    </div>
  );
}

export default function OrgManager({ orgs, owners }: { orgs: OrgCard[]; owners: OwnerRow[] }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", tagline: "", color: ORG_COLORS[1], founderName: "", founderEmail: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [e, setE] = useState({ name: "", tagline: "", color: ORG_COLORS[0] });

  async function call(url: string, method: string, body: object, key: string) {
    setBusy(key); setErr("");
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy("");
    if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.issues?.[0]?.message ?? d.error ?? "Something went wrong"); return null; }
    return r.json().catch(() => ({}));
  }

  async function create(ev: React.FormEvent) {
    ev.preventDefault();
    if (await call("/api/orgs", "POST", f, "create")) {
      setAdding(false); setF({ name: "", tagline: "", color: ORG_COLORS[1], founderName: "", founderEmail: "" }); router.refresh();
    }
  }
  async function open(id: string) {
    if (await call("/api/orgs/switch", "POST", { orgId: id }, "open" + id)) window.location.href = "/desk";
  }
  async function save(id: string) {
    if (await call(`/api/orgs/${id}`, "PATCH", e, "save" + id)) { setEditing(null); router.refresh(); }
  }
  async function setActive(id: string, active: boolean) {
    if (!active && !window.confirm("Archive this organisation? Its people can no longer sign in to it, and its scheduled emails stop. Nothing is deleted and you can restore it.")) return;
    if (await call(`/api/orgs/${id}`, "PATCH", { active }, "act" + id)) router.refresh();
  }
  async function owner(id: string, allOrgs: boolean) {
    if (await call("/api/orgs/owners", "POST", { userId: id, allOrgs }, "own" + id)) router.refresh();
  }

  return (
    <div className="space-y-6">
      {err && <p role="alert" className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{err}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {orgs.map((o) => (
          <div key={o.id} className={`panel overflow-hidden ${o.active ? "" : "opacity-60"}`}>
            <div className="h-1.5" style={{ background: o.color }} />
            <div className="space-y-4 p-5">
              {editing === o.id ? (
                <div className="space-y-3">
                  <input value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} className="input" maxLength={100} aria-label="Name" />
                  <input value={e.tagline} onChange={(x) => setE({ ...e, tagline: x.target.value })} className="input" maxLength={160} placeholder="One line about it (optional)" aria-label="Tagline" />
                  <Swatches value={e.color} onChange={(c) => setE({ ...e, color: c })} />
                  <div className="flex gap-2"><button onClick={() => save(o.id)} disabled={!!busy} className="btn btn-primary !py-1.5 text-sm">Save</button><button onClick={() => setEditing(null)} className="btn !py-1.5 text-sm">Cancel</button></div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white" style={{ background: o.color }}>{o.name.charAt(0).toUpperCase()}</span>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold leading-tight">{o.name}</h2>
                      <p className="line-clamp-2 text-sm text-mute">{o.tagline || (o.founders.length ? `Led by ${o.founders.join(", ")}` : "No founder yet")}</p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-ink/[0.04] p-3"><dt className="eyebrow">People</dt><dd className="text-2xl font-bold">{o.people}</dd></div>
                    <div className="rounded-xl bg-ink/[0.04] p-3"><dt className="eyebrow">Open tasks</dt><dd className="text-2xl font-bold">{o.openTasks}</dd></div>
                  </dl>
                  <div className="flex flex-wrap items-center gap-2">
                    {o.active && <button onClick={() => open(o.id)} disabled={!!busy} className="btn btn-primary !py-1.5 text-sm">{o.current ? "Open dashboard" : "Open"}</button>}
                    <button onClick={() => { setEditing(o.id); setE({ name: o.name, tagline: o.tagline, color: o.color }); }} className="btn !py-1.5 text-sm">Edit</button>
                    {!o.home && <button onClick={() => setActive(o.id, !o.active)} className="btn btn-ghost !py-1.5 text-sm">{o.active ? "Archive" : "Restore"}</button>}
                    {o.current && <span className="chip bg-brand/10 text-brand">Viewing now</span>}
                    {o.home && <span className="chip bg-ink/10 text-mute">Home</span>}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {!adding ? (
          <button onClick={() => setAdding(true)} className="panel panel-hover flex min-h-[15rem] flex-col items-center justify-center gap-2 border-dashed p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-2xl font-light text-brand">+</span>
            <span className="text-lg font-bold">New organisation</span>
            <span className="text-sm text-mute">Its own people, tasks and dashboard</span>
          </button>
        ) : (
          <form onSubmit={create} className="panel space-y-3 p-5 sm:col-span-2 xl:col-span-1">
            <h2 className="text-lg font-bold">New organisation</h2>
            <label className="block text-sm font-medium">Name<input value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} required minLength={2} maxLength={100} className="input mt-1" placeholder="e.g. Calvings" /></label>
            <label className="block text-sm font-medium">One line about it (optional)<input value={f.tagline} onChange={(x) => setF({ ...f, tagline: x.target.value })} maxLength={160} className="input mt-1" /></label>
            <div className="text-sm font-medium">Colour<div className="mt-2"><Swatches value={f.color} onChange={(c) => setF({ ...f, color: c })} /></div></div>
            <fieldset className="space-y-2 rounded-xl border border-line p-3">
              <legend className="px-1 text-xs font-semibold text-mute">First founder (optional, gets an email invite)</legend>
              <input value={f.founderName} onChange={(x) => setF({ ...f, founderName: x.target.value })} maxLength={100} className="input" placeholder="Name" aria-label="Founder name" />
              <input value={f.founderEmail} onChange={(x) => setF({ ...f, founderEmail: x.target.value })} type="email" className="input" placeholder="Email" aria-label="Founder email" />
            </fieldset>
            <div className="flex gap-2"><button disabled={!!busy} className="btn btn-primary">{busy === "create" ? "Creating…" : "Create"}</button><button type="button" onClick={() => setAdding(false)} className="btn">Cancel</button></div>
          </form>
        )}
      </div>

      <section className="panel p-5">
        <h2 className="section-title">Group owners</h2>
        <p className="mt-1 text-sm text-mute">Group owners can open every organisation. Other founders are limited to their own. Add people to an organisation by opening it and using People, then choose them here.</p>
        <ul className="mt-3 divide-y divide-line">
          {owners.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1"><div className="font-semibold">{o.name}{o.me && <span className="ml-2 text-xs text-mute">(you)</span>}</div><div className="truncate text-xs text-mute">{o.email} · {o.org}</div></div>
              {o.allOrgs ? <span className="chip bg-brand/10 text-brand">Group owner</span> : <span className="chip bg-ink/10 text-mute">{o.org} only</span>}
              {!o.me && <button onClick={() => owner(o.id, !o.allOrgs)} disabled={!!busy} className="btn !py-1 text-xs">{o.allOrgs ? "Remove access" : "Make group owner"}</button>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
