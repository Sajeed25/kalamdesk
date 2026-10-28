"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav({ lead, name, role }: { lead: boolean; name: string; role: string }) {
  const path = usePathname();
  const items = [
    ...(lead ? [{ href: "/desk", label: "Desk", icon: "◎" }] : []),
    { href: "/my-day", label: "My Day", icon: "☀" },
    { href: "/board", label: "Board", icon: "▦" },
    { href: "/list", label: "List", icon: "☰" },
    { href: "/calendar", label: "Calendar", icon: "▤" },
    { href: "/people", label: "People", icon: "☺" },
  ];
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <>
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line p-3 md:flex">
        <div className="px-2 py-3 text-lg font-bold">KalamDesk</div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={`rounded-lg px-3 py-2 text-sm font-medium ${path.startsWith(i.href) ? "bg-brand/10 text-brand" : "hover:bg-line/50"}`}>
              <span className="mr-2">{i.icon}</span>{i.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line px-2 pt-3 text-sm">
          <div className="font-medium">{name}</div>
          <div className="mb-2 text-xs text-mute">{role}</div>
          <Link href="/settings" className="mr-3 text-xs text-mute underline">Settings</Link>
          <button onClick={logout} className="text-xs text-mute underline">Sign out</button>
        </div>
      </aside>
      {/* mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-card md:hidden">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className={`flex flex-1 flex-col items-center py-2 text-xs ${path.startsWith(i.href) ? "text-brand" : "text-mute"}`}>
            <span className="text-base">{i.icon}</span>{i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
