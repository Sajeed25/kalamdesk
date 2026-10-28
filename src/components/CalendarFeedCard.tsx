"use client";
import { useState } from "react";
import { toast } from "@/lib/celebrate";

export default function CalendarFeedCard() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(rotate = false) {
    if (rotate && !window.confirm("Make a new link? Your old link stops working everywhere it is subscribed.")) return;
    setBusy(true);
    const r = await fetch("/api/me/calendar-feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rotate }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toast(d.error ?? "Could not get the link", "error");
    setUrl(d.url);
    if (rotate) toast("New link created. The old one no longer works.", "info");
  }
  return (
    <div className="panel max-w-md space-y-3 p-5">
      <h2 className="font-extrabold tracking-tight">Calendar link</h2>
      <p className="text-sm text-mute">See your due dates and school visits in Google Calendar, Outlook or Apple Calendar. They refresh by themselves.</p>
      {!url ? (
        <button onClick={() => load()} disabled={busy} className="btn">{busy ? "…" : "Show my calendar link"}</button>
      ) : (
        <div className="space-y-2">
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="input text-xs" aria-label="Calendar link" />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigator.clipboard?.writeText(url).then(() => toast("Link copied", "info"))} className="btn">Copy</button>
            <button onClick={() => load(true)} disabled={busy} className="btn">Reset link</button>
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-xs font-semibold text-mute">
            <li>Google Calendar: Other calendars → <b>+</b> → From URL → paste.</li>
            <li>Outlook: Add calendar → Subscribe from web → paste.</li>
            <li>iPhone: Settings → Calendar → Accounts → Add → Subscribed Calendar.</li>
          </ol>
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Anyone with this link can read your task titles. Don&apos;t share it; use Reset link if it leaks.</p>
        </div>
      )}
    </div>
  );
}
