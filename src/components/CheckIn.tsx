"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const OUTCOME: Record<string, string> = { PENDING: "Pending", DONE: "Done on time", LATE: "Done late", MISSED: "Missed" };

/** Field-visit check-in. Location is optional: if the device refuses or times out, the check-in still counts. */
export default function CheckIn({ instanceId, checkedInAt, outcome, canCheckIn }: { instanceId: string; checkedInAt: string | null; outcome: string; canCheckIn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shown, setShown] = useState(checkedInAt);

  async function go() {
    setBusy(true); setErr("");
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 8000, maximumAge: 60000 });
    });
    const res = await fetch(`/api/instances/${instanceId}/checkin`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : {}),
    });
    setBusy(false);
    if (!res.ok) return setErr((await res.json().catch(() => ({}))).error ?? "Could not check in");
    setShown((await res.json()).checkInAt);
    router.refresh();
  }

  return (
    <div className="panel flex flex-wrap items-center gap-3 p-3 text-sm">
      <span className="font-medium">Recurring activity</span>
      <span className="chip bg-line">{OUTCOME[outcome] ?? outcome}</span>
      {shown ? (
        <span className="text-emerald-700 dark:text-emerald-400">Checked in {new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }).format(new Date(shown))}</span>
      ) : canCheckIn && outcome !== "MISSED" ? (
        <button onClick={go} disabled={busy} className="btn btn-primary">{busy ? "Checking in…" : "Check in"}</button>
      ) : null}
      {err && <span role="alert" className="text-red-600">{err}</span>}
    </div>
  );
}
