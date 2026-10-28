"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/expenses";
import { toast } from "@/lib/celebrate";

export function ExpenseForm({ today }: { today: string }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch("/api/expenses", { method: "POST", body: new FormData(e.currentTarget) });
    setBusy(false);
    if (!r.ok) { const d = await r.json().catch(() => ({})); return setErr(d.issues?.[0]?.message ?? d.error ?? "Could not submit"); }
    ref.current?.reset(); toast("Claim sent 🧾"); router.refresh();
  }
  return (
    <form ref={ref} onSubmit={submit} className="panel grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
      <label className="block text-sm font-medium sm:col-span-2">What was it for?<input name="title" required maxLength={200} className="input mt-1" placeholder="Auto fare to a school visit" /></label>
      <label className="block text-sm font-medium">Amount (₹)<input name="amountInr" type="number" required min={1} step={1} inputMode="numeric" className="input mt-1" /></label>
      <label className="block text-sm font-medium">Category<select name="category" className="input mt-1" defaultValue="TRAVEL">{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select></label>
      <label className="block text-sm font-medium">Date you spent it<input name="spentOn" type="date" required defaultValue={today} max={today} className="input mt-1" /></label>
      <label className="block text-sm font-medium">Receipt photo or PDF (optional, up to 5 MB)<input name="receipt" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="input mt-1" /></label>
      <label className="block text-sm font-medium sm:col-span-2">Notes (optional)<input name="notes" maxLength={1000} className="input mt-1" /></label>
      {err && <p role="alert" className="text-sm font-semibold text-red-600 sm:col-span-2">{err}</p>}
      <div className="sm:col-span-2"><button disabled={busy} className="btn btn-primary">{busy ? "Sending…" : "Submit claim"}</button></div>
    </form>
  );
}

export function ClaimActions({ id, status, founder, mine }: { id: string; status: string; founder: boolean; mine: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  async function decide(action: "APPROVE" | "REJECT" | "PAID") {
    let note = "";
    if (action === "REJECT") { note = window.prompt("Why is it rejected? (they will see this)") ?? ""; if (note.trim().length < 3) return; }
    const r = await fetch(`/api/expenses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note }) });
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Could not save");
    router.refresh();
  }
  async function withdraw() {
    if (!window.confirm("Withdraw this claim?")) return;
    const r = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Could not withdraw");
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {founder && status === "SUBMITTED" && <><button onClick={() => decide("APPROVE")} className="btn btn-primary !py-1.5 text-sm">Approve</button><button onClick={() => decide("REJECT")} className="btn !py-1.5 text-sm">Reject</button></>}
      {founder && status === "APPROVED" && <button onClick={() => decide("PAID")} className="btn btn-primary !py-1.5 text-sm">Mark paid</button>}
      {mine && status === "SUBMITTED" && <button onClick={withdraw} className="btn !py-1.5 text-sm">Withdraw</button>}
      {err && <span role="alert" className="text-sm font-semibold text-red-600">{err}</span>}
    </div>
  );
}
