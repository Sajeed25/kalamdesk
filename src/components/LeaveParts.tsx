"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LEAVE_LABEL, LEAVE_TYPES } from "@/lib/leaveMeta";
import { toast } from "@/lib/celebrate";

type Opt = { id: string; name: string };

export function LeaveForm({ people, today }: { people: Opt[]; today: string }) {
  const router = useRouter();
  const [v, setV] = useState({ type: "CASUAL", fromDate: today, toDate: today, reason: "", backupUserId: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch("/api/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, backupUserId: v.backupUserId || null }) });
    setBusy(false);
    if (!r.ok) { const d = await r.json().catch(() => ({})); return setErr(d.issues?.[0]?.message ?? d.error ?? "Could not send"); }
    toast("Leave request sent 🌴"); router.refresh();
  }
  return (
    <form onSubmit={submit} className="panel grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
      <label className="block text-sm font-medium">Type<select value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })} className="input mt-1">{LEAVE_TYPES.map((t) => <option key={t} value={t}>{LEAVE_LABEL[t]}</option>)}</select></label>
      <label className="block text-sm font-medium">Who will cover for you?<select value={v.backupUserId} onChange={(e) => setV({ ...v, backupUserId: e.target.value })} className="input mt-1"><option value="">Nobody in particular</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="block text-sm font-medium">First day<input type="date" required value={v.fromDate} onChange={(e) => setV({ ...v, fromDate: e.target.value, toDate: e.target.value > v.toDate ? e.target.value : v.toDate })} className="input mt-1" /></label>
      <label className="block text-sm font-medium">Last day<input type="date" required value={v.toDate} min={v.fromDate} onChange={(e) => setV({ ...v, toDate: e.target.value })} className="input mt-1" /></label>
      <label className="block text-sm font-medium sm:col-span-2">Reason (optional)<input value={v.reason} maxLength={500} onChange={(e) => setV({ ...v, reason: e.target.value })} className="input mt-1" /></label>
      {err && <p role="alert" className="text-sm font-semibold text-red-600 sm:col-span-2">{err}</p>}
      <div className="sm:col-span-2"><button disabled={busy} className="btn btn-primary">{busy ? "Sending…" : "Ask for leave"}</button></div>
    </form>
  );
}

export function LeaveActions({ id, canDecide, canCancel, hasBackup, status }: { id: string; canDecide: boolean; canCancel: boolean; hasBackup: boolean; status: string }) {
  const router = useRouter();
  const [handOver, setHandOver] = useState(true);
  const [err, setErr] = useState("");
  async function act(action: "APPROVE" | "REJECT" | "CANCEL") {
    let note = "";
    if (action === "REJECT") { note = window.prompt("Why? (they will see this)") ?? ""; if (note.trim().length < 3) return; }
    if (action === "CANCEL" && !window.confirm("Cancel this leave?")) return;
    const r = await fetch(`/api/leave/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note, handOver: action === "APPROVE" && hasBackup && handOver }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(d.error ?? "Could not save");
    if (d.handed) toast(`${d.handed} task${d.handed > 1 ? "s" : ""} shared with the cover person`);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canDecide && status === "PENDING" && <>
        <button onClick={() => act("APPROVE")} className="btn btn-primary !py-1.5 text-sm">Approve</button>
        <button onClick={() => act("REJECT")} className="btn !py-1.5 text-sm">Decline</button>
        {hasBackup && <label className="flex items-center gap-1.5 text-xs font-semibold text-mute"><input type="checkbox" checked={handOver} onChange={(e) => setHandOver(e.target.checked)} />Share their open tasks with the cover person</label>}
      </>}
      {canCancel && <button onClick={() => act("CANCEL")} className="btn !py-1.5 text-sm">Cancel leave</button>}
      {err && <span role="alert" className="text-sm font-semibold text-red-600">{err}</span>}
    </div>
  );
}

const hm = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** One big button: I'm in / I'm out. Time is stamped by the server. */
export function AttendanceCard({ checkIn, checkOut }: { checkIn: string | null; checkOut: string | null }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(action: "in" | "out") {
    setBusy(true); setErr("");
    const r = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    setBusy(false);
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Could not save");
    toast(action === "in" ? "Checked in. Have a great day! ☀️" : "Checked out. See you tomorrow! 🌙"); router.refresh();
  }
  return (
    <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
      <div><div className="eyebrow">Attendance</div>
        <div className="text-lg font-extrabold">{!checkIn ? "Not checked in yet" : checkOut ? `Done: ${hm(checkIn)} to ${hm(checkOut)}` : `In since ${hm(checkIn)}`}</div></div>
      {!checkIn ? <button disabled={busy} onClick={() => go("in")} className="btn btn-primary">I'm in</button> : !checkOut ? <button disabled={busy} onClick={() => go("out")} className="btn">I'm out</button> : <span className="chip bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Day complete ✓</span>}
      {err && <span role="alert" className="w-full text-sm font-semibold text-red-600">{err}</span>}
    </div>
  );
}
