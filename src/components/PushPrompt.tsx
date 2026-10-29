"use client";
import { useEffect, useState } from "react";
import { usePush } from "./PushPrefs";

/** A one-time nudge on My Day for people who have not turned lock-screen alerts on. Dismissing it hides it on this device. */
export default function PushPrompt() {
  const { state, busy, enable } = usePush();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try { setHidden(localStorage.getItem("kd-push-dismissed") === "1"); } catch { setHidden(false); }
  }, []);
  if (hidden || state !== "off") return null; // only when it can actually be turned on right now
  return (
    <div className="panel space-y-3 p-4 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-xl" aria-hidden>🔔</span>
        <div className="min-w-0">
          <div className="font-bold">Never miss a task</div>
          <div className="text-sm text-mute">Get new tasks and reminders on your lock screen, even when the app is closed.</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={enable} disabled={busy} className="btn btn-primary flex-1 sm:flex-none">{busy ? "Turning on…" : "Turn on alerts"}</button>
        <button onClick={() => { try { localStorage.setItem("kd-push-dismissed", "1"); } catch {} setHidden(true); }} className="btn btn-ghost text-sm" aria-label="Hide this suggestion">Not now</button>
      </div>
    </div>
  );
}
