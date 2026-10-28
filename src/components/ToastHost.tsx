"use client";
import { useEffect, useState } from "react";
import type { ToastKind } from "@/lib/celebrate";

type T = { id: number; message: string; kind: ToastKind };
const STYLE: Record<ToastKind, { icon: string; ring: string }> = {
  success: { icon: "✓", ring: "from-emerald-400 to-teal-500" },
  info: { icon: "i", ring: "from-sky-400 to-indigo-500" },
  error: { icon: "!", ring: "from-rose-500 to-orange-500" },
};

/** Mounted once in the app layout. Anything can call toast("…") from lib/celebrate. */
export default function ToastHost() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    let n = 0;
    const onToast = (e: Event) => {
      const d = (e as CustomEvent<{ message: string; kind: ToastKind }>).detail;
      const id = ++n;
      setItems((cur) => [...cur.slice(-2), { id, message: d.message, kind: d.kind }]);
      window.setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 4200);
    };
    window.addEventListener("kd:toast", onToast);
    return () => window.removeEventListener("kd:toast", onToast);
  }, []);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-8 md:pl-[19rem]">
      {items.map((t) => (
        <div key={t.id} className="toast pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-base font-semibold shadow-2xl">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${STYLE[t.kind].ring} text-sm font-extrabold text-white`}>{STYLE[t.kind].icon}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
