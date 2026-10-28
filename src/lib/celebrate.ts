"use client";
// Small, dependency-free delight: confetti bursts and toasts. Both respect prefers-reduced-motion
// (confetti is skipped; toasts still appear without animation via CSS).

const COLORS = ["#6d4aff", "#c026d3", "#ff8c28", "#10b981", "#38bdf8", "#fbbf24", "#f43f5e"];

export function confetti(origin?: { x: number; y: number }, count = 34) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(root);
  const ox = origin?.x ?? window.innerWidth / 2;
  const oy = origin?.y ?? window.innerHeight / 3;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    const size = 6 + Math.random() * 7;
    const round = Math.random() < 0.4;
    el.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${size}px;height:${round ? size : size * 0.45}px;background:${COLORS[i % COLORS.length]};border-radius:${round ? "50%" : "2px"}`;
    root.appendChild(el);
    const dx = (Math.random() - 0.5) * 420;
    const rise = 90 + Math.random() * 150;
    const fall = 140 + Math.random() * 220;
    const spin = (Math.random() - 0.5) * 900;
    el.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx * 0.55}px,${-rise}px) rotate(${spin * 0.5}deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx}px,${fall}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 700, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }
    );
  }
  window.setTimeout(() => root.remove(), 2000);
}

export type ToastKind = "success" | "info" | "error";
export function toast(message: string, kind: ToastKind = "success") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kd:toast", { detail: { message, kind } }));
}

export function doneMessage(points: number) {
  const msgs = ["Nailed it!", "Another one down!", "Smooth work!", "On a roll!", "That's how it's done!"];
  const m = msgs[Math.floor(Math.random() * msgs.length)];
  return points > 0 ? `${m} +${Math.round(points * 10) / 10} points` : m;
}
