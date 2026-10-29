"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fmtRelative } from "@/lib/time";
import Icon from "./Icon";

type N = { id: string; title: string; body: string; url: string; readAt: string | null; createdAt: string };

export default function Bell() {
  const [items, setItems] = useState<N[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  async function load() {
    const r = await fetch("/api/notifications");
    if (!r.ok) return;
    const d = await r.json();
    setItems(d.items);
    setUnread(d.unread);
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (d.unread > 0) nav.setAppBadge?.(d.unread).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  async function toggle() {
    setOpen(!open);
    if (!open && unread) {
      await fetch("/api/notifications", { method: "POST" });
      setTimeout(() => setUnread(0), 1500);
    }
  }

  return (
    <div className="relative">
      <button onClick={toggle} aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} className="btn relative !px-3">
        <Icon name="bell" className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-extrabold text-white shadow-md" style={{ backgroundImage: "linear-gradient(135deg, rgb(var(--accent)), rgb(244 63 94))" }}>{unread}</span>}
      </button>
      {open && (
        <div className="panel absolute right-0 mt-3 max-h-[28rem] w-96 max-w-[90vw] overflow-auto p-1.5 shadow-2xl">
          {items.length === 0 && <p className="p-5 text-center text-sm font-semibold text-mute">All caught up. Nice! ✨</p>}
          {items.map((n) => (
            <Link key={n.id} href={n.url || "#"} onClick={() => setOpen(false)} className={`block rounded-2xl p-3 text-sm transition hover:bg-brand/10 ${n.readAt ? "" : "bg-brand/5"}`}>
              <div className="font-bold">{n.title}</div>
              {n.body && <div className="mt-0.5 text-xs text-mute">{n.body}</div>}
              <div className="mt-1 text-[11px] font-semibold text-mute">{fmtRelative(n.createdAt)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
