"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Masked = {
  encryptionReady: boolean; saved: boolean; account: string | null; idType: string | null; updatedAt: string | null;
  has: { accountHolder: boolean; accountNumber: boolean; ifsc: boolean; bankName: boolean; upiId: boolean; idNumber: boolean };
};
type Revealed = { accountHolder: string | null; accountNumber: string | null; ifsc: string | null; bankName: string | null; upiId: string | null; idType: string | null; idNumber: string | null };

const LABELS: [keyof Masked["has"], string][] = [
  ["accountHolder", "Account holder"], ["bankName", "Bank"], ["accountNumber", "Account number"], ["ifsc", "IFSC"], ["upiId", "UPI ID"], ["idNumber", "ID number"],
];
const AUTO_HIDE_SECONDS = 30;

async function call(url: string, method: string, body?: object) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data: d, error: (d.error ?? d.issues?.[0]?.message) as string | undefined };
}

export default function BankDetails({ userId, masked }: { userId: string; masked: Masked }) {
  const router = useRouter();
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [left, setLeft] = useState(0);
  const [askPw, setAskPw] = useState(false);
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const base = `/api/people/${userId}/bank`;

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function startAutoHide() {
    setLeft(AUTO_HIDE_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setLeft((s) => { if (s <= 1) { if (timer.current) clearInterval(timer.current); setRevealed(null); return 0; } return s - 1; }), 1000);
  }
  function hide() { if (timer.current) clearInterval(timer.current); setRevealed(null); setLeft(0); }

  async function reveal(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const a = await call("/api/auth/reauth", "POST", { password: pw, code: code || undefined });
    if (!a.ok) {
      setBusy(false);
      if (a.data?.needs2fa) setNeedCode(true); // keep the password; ask for the 6-digit code too
      else setPw("");
      return setErr(a.error ?? "Could not confirm your password");
    }
    setPw(""); setCode(""); setNeedCode(false);
    const r = await call(`${base}/reveal`, "POST");
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Could not reveal");
    setRevealed(r.data as Revealed);
    setAskPw(false);
    startAutoHide();
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    for (const k of ["accountHolder", "accountNumber", "ifsc", "bankName", "upiId", "idType", "idNumber"]) {
      const v = String(f.get(k) ?? "").trim();
      if (v) body[k] = v;
    }
    setBusy(true); setErr(""); setMsg("");
    const r = await call(base, "PUT", body);
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Could not save");
    (e.target as HTMLFormElement).reset();
    hide();
    setMsg("Saved and encrypted.");
    router.refresh();
  }

  async function clearField(field: string) {
    if (!window.confirm("Remove this saved value?")) return;
    const r = await call(base, "PUT", { clear: [field] });
    if (!r.ok) return setErr(r.error ?? "Could not remove");
    hide();
    router.refresh();
  }

  const shown = (k: keyof Masked["has"]) => {
    if (!masked.has[k]) return <span className="text-mute">not saved</span>;
    if (revealed) {
      const v = revealed[k];
      return <span className="font-mono">{k === "idNumber" && revealed.idType ? `${revealed.idType}: ` : ""}{v}</span>;
    }
    return <span className="font-mono">{k === "accountNumber" && masked.account ? masked.account : "••••••••"}</span>;
  };

  return (
    <div className="space-y-5">
      {!masked.encryptionReady && (
        <p role="alert" className="panel border-red-500/60 p-3 text-sm text-red-700 dark:text-red-400">
          Encryption is not set up on this server (FIELD_ENCRYPTION_KEY is missing), so bank and ID details cannot be saved or shown. See the README, “Bank details”.
        </p>
      )}

      <section className="panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Saved details</h2>
          {revealed ? (
            <div className="flex items-center gap-2 text-xs text-mute">Hides in {left}s <button onClick={hide} className="btn">Hide now</button></div>
          ) : masked.saved && !askPw ? (
            <button onClick={() => { setAskPw(true); setErr(""); }} className="btn">Reveal…</button>
          ) : null}
        </div>

        {askPw && (
          <form onSubmit={reveal} className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-line p-3">
            <label className="text-sm font-medium">Confirm your password to reveal
              <input type="password" autoFocus required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="input mt-1 !w-64" />
            </label>
            {needCode && (
              <label className="text-sm font-medium">6-digit code from your authenticator app
                <input inputMode="numeric" autoComplete="one-time-code" autoFocus required value={code} onChange={(e) => setCode(e.target.value)} className="input mt-1 !w-48 font-mono tracking-widest" placeholder="123456" />
              </label>
            )}
            <button disabled={busy} className="btn btn-primary">{busy ? "Checking…" : "Reveal"}</button>
            <button type="button" onClick={() => { setAskPw(false); setPw(""); }} className="btn">Cancel</button>
            <p className="w-full text-xs text-mute">Every reveal is recorded in the audit log with your name and the time.</p>
          </form>
        )}

        <dl className="grid grid-cols-[9rem_1fr_auto] items-center gap-x-3 gap-y-2 text-sm">
          {LABELS.map(([k, label]) => (
            <div key={k} className="contents">
              <dt className="text-mute">{label}</dt>
              <dd>{shown(k)}</dd>
              <dd>{masked.has[k] && !revealed && <button onClick={() => clearField(k)} className="text-xs text-mute underline">remove</button>}</dd>
            </div>
          ))}
        </dl>
        {masked.updatedAt && <p className="mt-3 text-xs text-mute">Last changed {new Date(masked.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>}
      </section>

      <form onSubmit={save} className="panel grid grid-cols-1 gap-4 p-4 sm:grid-cols-2" autoComplete="off">
        <h2 className="font-semibold sm:col-span-2">Add or replace details <span className="text-xs font-normal text-mute">(leave a box empty to keep what is saved)</span></h2>
        <label className="block text-sm font-medium">Account holder name<input name="accountHolder" maxLength={100} className="input mt-1" /></label>
        <label className="block text-sm font-medium">Bank name<input name="bankName" maxLength={100} className="input mt-1" /></label>
        <label className="block text-sm font-medium">Account number<input name="accountNumber" inputMode="numeric" className="input mt-1 font-mono" /></label>
        <label className="block text-sm font-medium">IFSC<input name="ifsc" placeholder="HDFC0001234" maxLength={11} className="input mt-1 font-mono uppercase" /></label>
        <label className="block text-sm font-medium">UPI ID<input name="upiId" placeholder="name@bank" className="input mt-1" /></label>
        <div className="grid grid-cols-[8rem_1fr] gap-2">
          <label className="block text-sm font-medium">ID type
            <select name="idType" defaultValue="" className="input mt-1"><option value="">—</option><option>PAN</option><option>AADHAAR</option><option>PASSPORT</option><option>OTHER</option></select>
          </label>
          <label className="block text-sm font-medium">ID number<input name="idNumber" className="input mt-1 font-mono uppercase" /></label>
        </div>
        {err && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{err}</p>}
        {msg && <p className="text-sm text-emerald-700 dark:text-emerald-400 sm:col-span-2">{msg}</p>}
        <div className="sm:col-span-2"><button disabled={busy || !masked.encryptionReady} className="btn btn-primary">Save encrypted</button></div>
      </form>
    </div>
  );
}
