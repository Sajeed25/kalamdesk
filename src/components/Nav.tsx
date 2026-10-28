"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

type Item = { href: string; label: string; icon: IconName };
export type NavLevel = { level: number; name: string; points: number; toNext: number; progress: number };

export function Logo({ size = "h-11 w-11" }: { size?: string }) {
  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold text-white shadow-lg`} style={{ backgroundImage: "linear-gradient(135deg, rgb(var(--grad-a)), rgb(var(--grad-b)))", boxShadow: "var(--glow)" }}>
      K
    </span>
  );
}

export default function Nav({ lead, name, role, lvl }: { lead: boolean; name: string; role: string; lvl: NavLevel }) {
  const path = usePathname();
  const groups: { title: string; items: Item[] }[] = [
    {
      title: "My work",
      items: [
        ...(lead ? [{ href: "/desk", label: "Desk", icon: "desk" as IconName }] : []),
        { href: "/my-day", label: "My Day", icon: "sun" },
        { href: "/update", label: "Daily update", icon: "pencil" },
        { href: "/board", label: "Board", icon: "board" },
        { href: "/list", label: "List", icon: "list" },
        { href: "/calendar", label: "Calendar", icon: "calendar" },
        { href: "/leave", label: "Leave", icon: "sun" },
        ...(lead ? [{ href: "/recurring", label: "Recurring", icon: "repeat" as IconName }] : []),
      ],
    },
    {
      title: "Performance",
      items: [
        { href: "/leaderboard", label: "Scores", icon: "trophy" },
        { href: "/challenges", label: "Challenges", icon: "target" },
        ...(lead ? [{ href: "/dashboard", label: "Dashboard", icon: "chart" as IconName }, { href: "/updates", label: "Stand-ups", icon: "chat" as IconName }] : []),
        { href: "/incentives", label: "Incentives", icon: "coins" },
        { href: "/referrals", label: "Referrals", icon: "gift" },
        { href: "/snapshots", label: "Published", icon: "doc" },
      ],
    },
    {
      title: "Company",
      items: [
        { href: "/people", label: "People", icon: "users" },
        { href: "/leads", label: "Leads", icon: "bolt" },
        { href: "/visits", label: "Visits", icon: "arrow" },
        { href: "/expenses", label: "Expenses", icon: "coins" },
        ...(lead ? [{ href: "/templates", label: "Templates", icon: "doc" as IconName }] : []),
      ],
    },
  ];
  const all = groups.flatMap((g) => g.items);
  // exact or child match, so /update does not light up on /updates
  const active = (href: string) => path === href || path.startsWith(href + "/");
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      {/* ---------- desktop sidebar ---------- */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-line/70 bg-card/60 p-4 backdrop-blur-xl md:flex">
        <Link href="/" className="mb-5 flex items-center gap-3 px-2 pt-1">
          <Logo />
          <span><span className="block text-xl font-extrabold leading-none tracking-tight">KalamDesk</span><span className="mt-1 block text-xs font-semibold text-mute">Robokalam · one calm place</span></span>
        </Link>

        <nav className="-mx-1 flex-1 space-y-5 overflow-y-auto px-1 pb-3" aria-label="Main">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="eyebrow mb-1.5 px-3">{g.title}</div>
              <div className="space-y-1">
                {g.items.map((i) => {
                  const on = active(i.href);
                  return (
                    <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-2xl px-2.5 py-2 text-[0.95rem] font-bold transition duration-150 ${on ? "text-white" : "text-ink/85 hover:bg-brand/10 hover:text-ink"}`}
                      style={on ? { backgroundImage: "linear-gradient(135deg, rgb(var(--grad-a)), rgb(var(--grad-b)))", boxShadow: "var(--glow)" } : undefined}>
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${on ? "bg-white/20" : "bg-line/60 group-hover:bg-brand/15 group-hover:text-brand"}`}><Icon name={i.icon} className="h-[1.15rem] w-[1.15rem]" /></span>
                      {i.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* level card */}
        <div className="panel mt-2 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white" style={{ backgroundImage: "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--grad-b)))" }}>{initials}</span>
            <div className="min-w-0">
              <div className="truncate font-extrabold leading-tight">{name}</div>
              <div className="text-xs font-semibold text-mute">{role.charAt(0) + role.slice(1).toLowerCase()}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-bold">
            <span className="inline-flex items-center gap-1 text-brand"><Icon name="bolt" className="h-3.5 w-3.5" />Level {lvl.level} · {lvl.name}</span>
            <span className="text-mute">{lvl.points} pts</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(lvl.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to level ${lvl.level + 1}`}>
            <div className="xp-bar h-full rounded-full" style={{ width: `${Math.max(4, Math.round(lvl.progress * 100))}%` }} />
          </div>
          <div className="mt-1.5 text-[11px] font-semibold text-mute">{lvl.toNext} pts to level {lvl.level + 1}</div>
          <div className="mt-3 flex gap-4 text-xs font-semibold text-mute">
            <Link href="/settings" className="hover:text-brand">Settings</Link>
            <button onClick={logout} className="hover:text-brand">Sign out</button>
          </div>
        </div>
      </aside>

      {/* ---------- mobile floating bar (scrolls sideways) ---------- */}
      <nav aria-label="Main" className="glass fixed inset-x-3 bottom-3 z-30 flex gap-1 overflow-x-auto rounded-3xl border border-line/80 p-1.5 shadow-2xl md:hidden">
        {all.map((i) => {
          const on = active(i.href);
          return (
            <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
              className={`flex min-w-[4.6rem] flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[11px] font-bold transition ${on ? "text-white" : "text-mute"}`}
              style={on ? { backgroundImage: "linear-gradient(135deg, rgb(var(--grad-a)), rgb(var(--grad-b)))" } : undefined}>
              <Icon name={i.icon} className="h-5 w-5" />{i.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
