"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type O = { id: string; name: string; color: string };

/**
 * Shows which organisation you are in. Group owners get a menu to jump between organisations; everyone else
 * just sees their own organisation's name (they can never open another one).
 */
export default function OrgSwitcher({ current, orgs, canSwitch, dark = false, compact = false }: { current: O; orgs: O[]; canSwitch: boolean; dark?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  async function pick(id: string) {
    if (id === current.id) return setOpen(false);
    setBusy(id);
    const r = await fetch("/api/orgs/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId: id }) });
    if (r.ok) window.location.href = "/"; // a fresh start: ids from one organisation mean nothing in another
    else setBusy("");
  }

  const face = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-md" style={{ background: current.color }}>{current.name.charAt(0).toUpperCase()}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[0.95rem] font-bold leading-tight">{current.name}</span>
        {!compact && <span className="block text-[11px] font-medium text-mute">{canSwitch ? "Switch organisation" : "KalamDesk"}</span>}
      </span>
      {canSwitch && <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-mute" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8l4-4 4 4M6 12l4 4 4-4" /></svg>}
    </>
  );

  if (!canSwitch) return <div className="flex items-center gap-3 rounded-2xl px-2 py-1.5">{face}</div>;

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 transition ${dark ? "hover:bg-white/5" : "hover:bg-ink/5"}`}>
        {face}
      </button>
      {open && (
        <div role="menu" className="panel absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto p-1.5" style={dark ? { background: "rgb(var(--card))" } : undefined}>
          <div className="eyebrow px-3 pb-1 pt-2">Your organisations</div>
          {orgs.map((o) => (
            <button key={o.id} role="menuitem" onClick={() => pick(o.id)} disabled={!!busy}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-ink/5 disabled:opacity-60">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: o.color }} />
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              {o.id === current.id && <span className="text-xs font-bold text-brand">Here</span>}
              {busy === o.id && <span className="text-xs text-mute">…</span>}
            </button>
          ))}
          <Link href="/organisations" onClick={() => setOpen(false)} className="mt-1 block rounded-xl border-t border-line px-3 py-2.5 text-sm font-bold text-brand hover:bg-ink/5">Manage organisations</Link>
        </div>
      )}
    </div>
  );
}
