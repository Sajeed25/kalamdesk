"use client";
import { useEffect } from "react";
import { confetti } from "@/lib/celebrate";

export type CelebrationView = { userId: string; kind: string; text: string };
const EMOJI: Record<string, string> = { BIRTHDAY: "🎂", ANNIVERSARY: "🎉", INTERN_END: "💙" };

/** Today's team good news. Confetti fires once per person per day, never on every page load. */
export default function CelebrationBanner({ items, dayKey }: { items: CelebrationView[]; dayKey: string }) {
  useEffect(() => {
    if (items.length === 0) return;
    try {
      const k = `kd-cheer-${dayKey}`;
      if (localStorage.getItem(k)) return;
      localStorage.setItem(k, "1");
    } catch { /* private mode: cheer anyway */ }
    const t = setTimeout(() => confetti(undefined, 90), 500);
    return () => clearTimeout(t);
  }, [items.length, dayKey]);
  if (items.length === 0) return null;
  return (
    <section className="panel rise space-y-2 border-2 border-brand/30 p-4" aria-label="Team celebrations">
      <div className="eyebrow">Worth a cheer today</div>
      {items.map((c, i) => <div key={i} className="flex items-center gap-3 text-lg font-extrabold tracking-tight"><span className="text-3xl" aria-hidden>{EMOJI[c.kind] ?? "✨"}</span>{c.text}</div>)}
    </section>
  );
}
