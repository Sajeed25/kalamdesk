import type { BadgeStatus, Tier } from "@/lib/badges";

const DISC: Record<Tier, string> = {
  bronze: "from-orange-300 to-amber-600",
  silver: "from-slate-200 to-slate-400",
  gold: "from-yellow-300 to-amber-500",
  special: "from-violet-400 to-fuchsia-500",
};

/** Earned badges are bright with a glow; locked ones are dimmed and show how close you are. */
export default function BadgeWall({ badges, compact = false }: { badges: BadgeStatus[]; compact?: boolean }) {
  const ordered = [...badges].sort((a, b) => Number(b.earned) - Number(a.earned));
  return (
    <ul className={`grid grid-cols-2 gap-3 ${compact ? "sm:grid-cols-4" : "sm:grid-cols-3 lg:grid-cols-6"}`}>
      {ordered.map((b, i) => (
        <li key={b.id} className={`rise rounded-3xl border p-4 text-center transition ${b.earned ? "border-brand/30 bg-card" : "border-line bg-line/30"}`} style={{ ["--i" as string]: Math.min(i, 10) }} title={b.hint}>
          <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-3xl ${DISC[b.tier]} ${b.earned ? "shadow-lg" : "opacity-40 grayscale"}`} aria-hidden>{b.emoji}</span>
          <div className={`mt-3 text-sm font-extrabold leading-tight ${b.earned ? "" : "text-mute"}`}>{b.name}</div>
          <div className="mt-1 text-[11px] font-semibold leading-snug text-mute">{b.earned ? "Earned ✓" : b.hint}</div>
          {!b.earned && (
            <div className="mt-2" aria-label={`${b.have} of ${b.need}`}>
              <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand/70" style={{ width: `${Math.round((b.have / b.need) * 100)}%` }} /></div>
              <div className="mt-1 text-[11px] font-bold text-mute">{b.have}/{b.need}</div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
