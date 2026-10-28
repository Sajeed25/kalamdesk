"use client";
import { useState } from "react";

export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
    });
    if (res.ok) window.location.href = "/";
    else {
      setError((await res.json()).error ?? "Could not sign in");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">KalamDesk</h1>
      <p className="mb-6 text-sm text-mute">Everyone&apos;s work, one calm place.</p>
      <form onSubmit={submit} className="panel space-y-3 p-5">
        <label className="block text-sm font-medium">Email
          <input name="email" type="email" required autoComplete="username" className="input mt-1" />
        </label>
        <label className="block text-sm font-medium">Password
          <input name="password" type="password" required autoComplete="current-password" className="input mt-1" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="btn btn-primary w-full">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
