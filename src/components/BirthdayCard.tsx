"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/lib/celebrate";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Optional: share only day and month so the team can celebrate with you. */
export default function BirthdayCard({ current }: { current: string | null }) {
  const router = useRouter();
  const [m, setM] = useState(current ? Number(current.slice(0, 2)) : 0);
  const [d, setD] = useState(current ? Number(current.slice(3)) : 0);
  const [err, setErr] = useState("");
  async function save(clear: boolean) {
    setErr("");
    const p = (n: number) => String(n).padStart(2, "0");
    const r = await fetch("/api/me/birthday", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ birthday: clear ? null : `${p(m)}-${p(d)}` }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); return setErr(j.issues?.[0]?.message ?? j.error ?? "Could not save"); }
    if (clear) { setM(0); setD(0); }
    toast(clear ? "Birthday removed" : "Saved. We'll cheer you on! 🎂"); router.refresh();
  }
  return (
    <div className="panel w-full max-w-sm space-y-3 p-5">
      <div><div className="font-extrabold">Your birthday 🎂 (optional)</div><p className="text-sm font-semibold text-mute">Only the day and month are stored, and only so the team can celebrate. Remove it any time.</p></div>
      <div className="flex gap-2">
        <select aria-label="Month" value={m} onChange={(e) => setM(Number(e.target.value))} className="input"><option value={0}>Month</option>{MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
        <select aria-label="Day" value={d} onChange={(e) => setD(Number(e.target.value))} className="input !w-24"><option value={0}>Day</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      <div className="flex gap-2"><button disabled={!m || !d} onClick={() => save(false)} className="btn btn-primary">Save</button>{current && <button onClick={() => save(true)} className="btn">Remove</button>}</div>
    </div>
  );
}
