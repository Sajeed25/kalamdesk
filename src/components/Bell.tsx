"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fmtRelative } from "@/lib/time";

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
      <button onClick={toggle} aria-label="Notifications" className="btn relative">
        🔔
        {unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="panel absolute right-0 mt-2 max-h-96 w-80 max-w-[90vw] overflow-auto shadow-xl">
          {items.length === 0 && <p className="p-4 text-sm text-mute">Nothing yet. You&apos;re all caught up.</p>}
          {items.map((n) => (
            <Link key={n.id} href={n.url || "#"} onClick={() => setOpen(false)} className={`block border-b border-line p-3 text-sm last:border-0 hover:bg-line/40 ${n.readAt ? "" : "bg-brand/5"}`}>
              <div className="font-medium">{n.title}</div>
              {n.body && <div className="text-xs text-mute">{n.body}</div>}
              <div className="mt-0.5 text-[11px] text-mute">{fmtRelative(n.createdAt)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
