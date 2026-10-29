"use client";
import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Install KalamDesk" for phones and laptops.
 *  - Android / Chrome / Edge: one tap, using the browser's own install prompt.
 *  - iPhone / iPad (Safari has no install prompt): shows the "Add to Home Screen" steps.
 *  - Already installed (opened from the home screen): shows nothing in the header.
 * variant "chip" is the small header button; "card" is the larger explanation used in Settings.
 */
export default function InstallApp({ variant = "chip" }: { variant?: "chip" | "card" }) {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [standalone, setStandalone] = useState(true); // assume installed until proven otherwise (avoids a flash)
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(isStandalone);
    const ua = navigator.userAgent;
    setIos(/iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && "ontouchend" in document));
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    const onInstalled = () => { setInstalled(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return variant === "card" ? <div className="panel p-5 text-sm"><b>KalamDesk is installed on this device.</b> You are using the app right now.</div> : null;
  if (installed) return variant === "card" ? <div className="panel p-5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Installed. Look for KalamDesk on your home screen.</div> : null;
  const canInstall = !!evt;
  if (!canInstall && !ios && variant === "chip") return null; // nothing useful to offer in the header

  async function click() {
    if (evt) {
      await evt.prompt();
      await evt.userChoice.catch(() => null);
      setEvt(null);
    } else setHelp(true);
  }

  const steps = ios
    ? ["Tap the Share button at the bottom of Safari (the square with an arrow).", "Scroll down and tap Add to Home Screen.", "Tap Add. KalamDesk now opens from your home screen like any app."]
    : ["Open this page in Chrome (Android) or Edge.", "Open the browser menu (the three dots).", "Tap Install app, or Add to Home screen."];

  return (
    <>
      {variant === "chip" ? (
        <button onClick={click} className="btn !min-h-[2.4rem] !px-3 text-sm" aria-label="Install the KalamDesk app">
          <span aria-hidden>⬇</span> <span className="hidden sm:inline">Install app</span>
        </button>
      ) : (
        <div className="panel space-y-3 p-5">
          <h2 className="section-title">Install KalamDesk as an app</h2>
          <p className="text-sm text-mute">Open it from your home screen in one tap, full screen, with no browser bar. Works on Android, iPhone and laptops.</p>
          <button onClick={click} className="btn btn-primary">{canInstall ? "Install the app" : "Show me how"}</button>
        </div>
      )}
      {help && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={() => setHelp(false)}>
          <div className="panel w-full max-w-md space-y-3 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">{ios ? "Add KalamDesk to your iPhone" : "Install KalamDesk"}</h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
            <button onClick={() => setHelp(false)} className="btn w-full">Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
