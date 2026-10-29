"use client";
import { useCallback, useEffect, useState } from "react";

type State = "loading" | "unsupported" | "ios-install" | "not-configured" | "denied" | "off" | "on";

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Shared logic: works out the state of lock-screen notifications on THIS device and exposes enable / disable. */
export function usePush() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState(ios && !standalone ? "ios-install" : "unsupported");
    if (ios && !standalone) return setState("ios-install"); // iPhone only allows notifications for apps added to the Home Screen
    const info = await fetch("/api/me/push").then((r) => r.json()).catch(() => null);
    if (!info?.configured) return setState("not-configured");
    if (Notification.permission === "denied") return setState("denied");
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    setState(sub && Notification.permission === "granted" && info.devices > 0 ? "on" : "off");
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function enable() {
    setBusy(true); setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }
      const info = await fetch("/api/me/push").then((r) => r.json());
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(info.publicKey) }));
      const r = await fetch("/api/me/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Could not save");
      setState("on"); setMsg({ ok: true, text: "Done. This phone will now show KalamDesk alerts on the lock screen." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not turn notifications on" });
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await fetch("/api/me/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
      setState("off"); setMsg({ ok: true, text: "Lock-screen alerts are off for this phone." });
    } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/me/push/test", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Test sent. It should appear on your lock screen in a few seconds." } : { ok: false, text: d.error ?? "Could not send the test" });
  }

  return { state, busy, msg, enable, disable, test };
}

/** The Settings card. */
export default function PushPrefs() {
  const { state, busy, msg, enable, disable, test } = usePush();
  return (
    <div className="panel max-w-sm space-y-3 p-5">
      <h2 className="font-semibold">Lock-screen notifications</h2>
      <p className="text-xs text-mute">Get new tasks, blockers, sent-back work, reminders and kudos as a normal alert on this phone, even when KalamDesk is closed. Each phone or browser is set up separately.</p>
      {state === "loading" && <p className="text-sm text-mute">Checking…</p>}
      {state === "unsupported" && <p className="text-sm">This browser cannot show lock-screen notifications. Try Chrome or Edge, or install KalamDesk as an app.</p>}
      {state === "ios-install" && <p className="text-sm">On iPhone and iPad, notifications work once KalamDesk is added to your Home Screen (iOS 16.4 or newer). Tap <b>Share → Add to Home Screen</b>, open the app from there, and come back to this page.</p>}
      {state === "not-configured" && <p className="text-sm">Lock-screen notifications are not switched on for this workspace yet. Ask your founder.</p>}
      {state === "denied" && <p className="text-sm">Notifications are blocked for this site on this phone. Open the browser's site settings (the lock icon next to the address) → Notifications → Allow, then reload this page.</p>}
      {state === "off" && <button onClick={enable} disabled={busy} className="btn btn-primary">{busy ? "Turning on…" : "Turn on for this phone"}</button>}
      {state === "on" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">On for this phone</span>
          <button onClick={test} disabled={busy} className="btn !py-1.5 text-sm">Send me a test</button>
          <button onClick={disable} disabled={busy} className="btn btn-ghost !py-1.5 text-sm">Turn off</button>
        </div>
      )}
      {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-600"}`}>{msg.text}</p>}
      <p className="text-[11px] text-mute">Alerts show the task title on your lock screen. Turn off here, or in your phone's settings, any time.</p>
    </div>
  );
}
