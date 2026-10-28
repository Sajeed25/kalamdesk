"use client";
import { useState } from "react";
import Icon from "@/components/Icon";
import { Logo } from "@/components/Nav";

const POINTS = [
  { icon: "sun" as const, title: "One calm place for your day", text: "See exactly what to do next, and tick it off." },
  { icon: "flame" as const, title: "Build streaks, earn points", text: "Daily updates and on-time work level you up." },
  { icon: "trophy" as const, title: "Wins get noticed", text: "Fair scores, clear rewards, real recognition." },
];

export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error ?? `Server error (${res.status}). The site is not set up correctly yet. Check /api/health`);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <main className="grid grid-cols-1 min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* brand panel */}
      <section className="hero relative hidden !rounded-none !p-14 lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex items-center gap-3"><Logo /><span className="text-2xl font-extrabold tracking-tight">KalamDesk</span></div>
        <div className="relative z-10 max-w-xl">
          <h2 className="text-6xl font-extrabold leading-[1.02] tracking-tight">Your work.<br />Your wins.</h2>
          <p className="mt-5 text-xl font-semibold text-white/85">Robokalam&apos;s daily operations, made fast, fair and a little bit fun.</p>
          <ul className="mt-10 space-y-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur"><Icon name={p.icon} className="h-6 w-6" /></span>
                <span><span className="block text-lg font-extrabold">{p.title}</span><span className="text-base font-medium text-white/80">{p.text}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-sm font-semibold text-white/70">Hyderabad · Warangal</p>
      </section>

      {/* form */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><Logo /><span className="text-2xl font-extrabold tracking-tight">KalamDesk</span></div>
          <h1 className="page-title">Welcome back</h1>
          <p className="mb-7 mt-1 text-lg font-medium text-mute">Sign in to see what&apos;s on today.</p>
          <form onSubmit={submit} className="panel space-y-5 p-6 sm:p-8">
            <label className="block text-sm font-bold">Email
              <input name="email" type="email" required autoComplete="username" className="input mt-2" placeholder="you@robokalam.com" />
            </label>
            <label className="block text-sm font-bold">Password
              <input name="password" type="password" required autoComplete="current-password" className="input mt-2" placeholder="••••••••" />
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
            <button disabled={busy} className="btn btn-primary w-full !min-h-[3.25rem] !text-base">{busy ? "Signing in…" : "Sign in"}</button>
            <a href="/forgot" className="block text-center text-sm font-semibold text-mute hover:text-brand">Forgot password?</a>
          </form>
        </div>
      </section>
    </main>
  );
}
