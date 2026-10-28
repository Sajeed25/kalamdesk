"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";
import OrgSwitcher from "./OrgSwitcher";

type Item = { href: string; label: string; icon: IconName };
export type NavLevel = { level: number; name: string; points: number; toNext: number; progress: number };

export function Logo({ size = "h-11 w-11", letter = "K" }: { size?: string; letter?: string }) {
  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold text-white shadow-lg`} style={{ backgroundImage: "linear-gradient(135deg, rgb(var(--grad-a)), rgb(var(--grad-b)))", boxShadow: "var(--glow)" }}>
      {letter}
    </span>
  );
}

type OrgLite = { id: string; name: string; color: string };

export default function Nav({ lead, name, role, lvl, org, orgs, owner }: { lead: boolean; name: string; role: string; lvl: NavLevel; org: OrgLite; orgs: OrgLite[]; owner: boolean }) {
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
        ...(owner ? [{ href: "/organisations", label: "Organisations", icon: "board" as IconName }] : []),
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
      <aside className="rail sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-[rgb(var(--side-line))] p-4 md:flex">
        <div className="mb-5 pt-1"><OrgSwitcher current={org} orgs={orgs} canSwitch={owner} dark /></div>

        <nav className="-mx-1 flex-1 space-y-5 overflow-y-auto px-1 pb-3" aria-label="Main">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="eyebrow mb-1.5 px-3">{g.title}</div>
              <div className="space-y-1">
                {g.items.map((i) => {
                  const on = active(i.href);
                  return (
                    <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-xl px-2.5 py-1.5 text-[0.92rem] font-semibold transition duration-150 ${on ? "bg-white/[0.09] text-white" : "text-ink/70 hover:bg-white/[0.05] hover:text-ink"}`}>
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${on ? "text-white shadow-md" : "text-mute group-hover:text-ink"}`} style={on ? { backgroundImage: "linear-gradient(160deg, rgb(var(--grad-a)), rgb(var(--grad-b)))", boxShadow: "var(--glow)" } : undefined}><Icon name={i.icon} className="h-[1.05rem] w-[1.05rem]" /></span>
                      {i.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* level card */}
        <div className="mt-2 rounded-2xl border border-[rgb(var(--side-line))] bg-white/[0.04] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white" style={{ backgroundImage: "linear-gradient(135deg, rgb(var(--grad-a)), rgb(var(--grad-b)))" }}>{initials}</span>
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
