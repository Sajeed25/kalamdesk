"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { confetti, toast } from "@/lib/celebrate";

async function post(url: string, body?: object) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, data: d, error: (d.error ?? d.issues?.[0]?.message) as string | undefined };
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  const text = `KalamDesk recovery codes\nKeep these somewhere safe. Each code works once.\n\n${codes.join("\n")}\n`;
  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = "kalamdesk-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-400/50 bg-amber-400/10 p-4 text-sm font-semibold">
        Save these recovery codes now. They are shown <b>only once</b>. If you lose your phone, one of these lets you sign in.
      </div>
      <ul className="grid grid-cols-2 gap-2 font-mono text-base font-bold" aria-label="Recovery codes">
        {codes.map((c) => <li key={c} className="rounded-xl bg-line/50 px-3 py-2 text-center">{c}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { navigator.clipboard?.writeText(text).then(() => toast("Codes copied", "info")); }} className="btn">Copy</button>
        <button onClick={download} className="btn">Download .txt</button>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />I have saved these codes</label>
      <button disabled={!saved} onClick={onDone} className="btn btn-primary">Done</button>
    </div>
  );
}

export default function TwoFactorPanel({ enabled, recoveryLeft, encryptionReady, isFounder }: { enabled: boolean; recoveryLeft: number; encryptionReady: boolean; isFounder: boolean }) {
  const router = useRouter();
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState("");
  const [c2, setC2] = useState("");
  const [mode, setMode] = useState<"" | "disable" | "regen">("");

  async function start() {
    setBusy(true); setErr("");
    const r = await post("/api/me/2fa/start");
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Could not start");
    setSetup({ qr: r.data.qr, secret: r.data.secret });
  }
  async function enable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await post("/api/me/2fa/enable", { code });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "That code didn't work");
    confetti();
    toast("Two-step sign-in is on 🔒");
    setSetup(null); setCode("");
    setCodes(r.data.recoveryCodes);
  }
  async function confirmAction(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await post(mode === "disable" ? "/api/me/2fa/disable" : "/api/me/2fa/recovery", { password: pw, code: c2 });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Could not confirm");
    setPw(""); setC2("");
    if (mode === "regen") setCodes(r.data.recoveryCodes);
    else toast("Two-step sign-in is off", "info");
    setMode("");
    router.refresh();
  }

  if (codes) return <div className="panel max-w-xl p-6"><h2 className="section-title mb-3">Your recovery codes</h2><RecoveryCodes codes={codes} onDone={() => { setCodes(null); router.refresh(); }} /></div>;

  if (!enabled)
    return (
      <div className="panel max-w-xl space-y-4 p-6">
        <div className="flex items-center gap-3"><span className="chip bg-amber-400/20 text-amber-700 dark:text-amber-300">Off</span><h2 className="section-title">Two-step sign-in</h2></div>
        <p className="text-sm font-semibold text-mute">Adds a 6-digit code from an app like Google Authenticator or Microsoft Authenticator to your password. {isFounder && "As a founder you can reveal bank details, so this matters most for you."}</p>
        {!encryptionReady && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300">The server needs FIELD_ENCRYPTION_KEY before 2FA can be stored safely.</p>}
        {!setup ? (
          <button onClick={start} disabled={busy || !encryptionReady} className="btn btn-primary">{busy ? "Preparing…" : "Set up two-step sign-in"}</button>
        ) : (
          <form onSubmit={enable} className="space-y-4">
            <ol className="list-decimal space-y-3 pl-5 text-sm font-semibold">
              <li>Open your authenticator app and choose <b>Scan a QR code</b>.
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setup.qr} alt="QR code to scan with your authenticator app" width={200} height={200} className="mt-2 rounded-2xl border border-line bg-white p-2" />
                <div className="mt-2 text-xs text-mute">Can&apos;t scan? Enter this key by hand: <b className="font-mono text-ink">{setup.secret}</b></div>
              </li>
              <li>Type the 6-digit code the app now shows:
                <input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} className="input mt-2 !w-48 font-mono text-lg tracking-[0.25em]" placeholder="123456" aria-label="6-digit code" />
              </li>
            </ol>
            {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
            <div className="flex gap-2"><button disabled={busy || code.replace(/\s/g, "").length < 6} className="btn btn-primary">{busy ? "Checking…" : "Turn on"}</button><button type="button" onClick={() => { setSetup(null); setCode(""); }} className="btn">Cancel</button></div>
          </form>
        )}
        {!setup && err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      </div>
    );

  return (
    <div className="panel max-w-xl space-y-4 p-6">
      <div className="flex items-center gap-3"><span className="chip bg-good/15 text-good">On</span><h2 className="section-title">Two-step sign-in</h2></div>
      <p className="text-sm font-semibold text-mute">Your account needs your password and a code from your authenticator app. You have <b className={recoveryLeft <= 2 ? "text-red-600" : "text-ink"}>{recoveryLeft}</b> unused recovery code{recoveryLeft === 1 ? "" : "s"}.</p>
      {recoveryLeft <= 2 && <p className="rounded-xl bg-amber-400/10 p-3 text-sm font-semibold">You are running low on recovery codes. Generate a new set.</p>}
      {mode === "" ? (
        <div className="flex flex-wrap gap-2"><button onClick={() => { setMode("regen"); setErr(""); }} className="btn">New recovery codes</button><button onClick={() => { setMode("disable"); setErr(""); }} className="btn">Turn off</button></div>
      ) : (
        <form onSubmit={confirmAction} className="space-y-3 rounded-2xl border border-line p-4">
          <p className="text-sm font-bold">{mode === "disable" ? "Confirm to turn off two-step sign-in" : "Confirm to replace your recovery codes (the old ones stop working)"}</p>
          <input type="password" required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="input" placeholder="Your password" aria-label="Password" />
          <input required autoComplete="one-time-code" value={c2} onChange={(e) => setC2(e.target.value)} className="input font-mono tracking-widest" placeholder="6-digit code or a recovery code" aria-label="Code" />
          {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
          <div className="flex gap-2"><button disabled={busy} className="btn btn-primary">{busy ? "Checking…" : "Confirm"}</button><button type="button" onClick={() => { setMode(""); setErr(""); }} className="btn">Cancel</button></div>
        </form>
      )}
    </div>
  );
}
