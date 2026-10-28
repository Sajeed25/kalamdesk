"use client";
import Link from "next/link";
import { useState } from "react";

async function post(url: string, body: object) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: r.ok, error: r.ok ? "" : ((await r.json().catch(() => ({}))).error as string) ?? "Something went wrong" };
}

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await post("/api/auth/forgot", { email: new FormData(e.currentTarget).get("email") });
    setSent(true);
  }
  if (sent) return <p className="panel p-5 text-sm">If that email has an account, a reset link is on its way. It expires in 1 hour.</p>;
  return (
    <form onSubmit={submit} className="panel space-y-3 p-5">
      <label className="block text-sm font-medium">Work email
        <input name="email" type="email" required className="input mt-1" />
      </label>
      <button className="btn btn-primary w-full">Send reset link</button>
      <Link href="/login" className="block text-center text-xs text-mute underline">Back to sign in</Link>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) return setErr("Passwords don't match");
    const r = await post("/api/auth/reset", { token, password: f.get("password") });
    if (r.ok) setDone(true);
    else setErr(r.error);
  }
  if (done) return <div className="panel space-y-3 p-5 text-sm"><p>Password updated.</p><Link href="/login" className="btn btn-primary w-full">Sign in</Link></div>;
  return (
    <form onSubmit={submit} className="panel space-y-3 p-5">
      <label className="block text-sm font-medium">New password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="input mt-1" />
      </label>
      <label className="block text-sm font-medium">Confirm password
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input mt-1" />
      </label>
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <button className="btn btn-primary w-full">Set password</button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const r = await post("/api/me/password", { current: f.get("current"), next: f.get("next") });
    setMsg({ ok: r.ok, text: r.ok ? "Password changed." : r.error });
    if (r.ok) form.reset();
  }
  return (
    <form onSubmit={submit} className="panel max-w-sm space-y-3 p-5">
      <h2 className="font-semibold">Change password</h2>
      <input name="current" type="password" required placeholder="Current password" autoComplete="current-password" className="input" />
      <input name="next" type="password" required minLength={8} placeholder="New password (8+ characters)" autoComplete="new-password" className="input" />
      {msg && <p role="alert" className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>}
      <button className="btn btn-primary">Update password</button>
    </form>
  );
}
