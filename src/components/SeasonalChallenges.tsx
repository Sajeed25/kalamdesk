import { db } from "@/lib/db";
import { istDateKey } from "@/lib/time";
import { METRIC_LABEL, challengeProgress, phase } from "@/lib/challenges";
import { ChallengeButtons, NewChallenge } from "./ChallengeAdmin";

/** Founder-made challenges with a progress bar and the top three contributors. Renders nothing if there are none (and no founder to create one). */
export default async function SeasonalChallenges({ founder }: { founder: boolean }) {
  const today = istDateKey();
  const rows = await db.challenge.findMany({ where: founder ? {} : { active: true }, orderBy: { startsOn: "desc" }, take: 20 }).catch(() => []);
  const shown = rows.filter((c) => founder || phase(c, today) !== "ENDED" || c.endsOn >= istDateKey(new Date(Date.now() - 14 * 864e5)));
  if (shown.length === 0 && !founder) return null;
  const names = new Map((await db.user.findMany({ select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  const cards = await Promise.all(shown.map(async (c) => ({ c, p: await challengeProgress(c), ph: phase(c, today) })));
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="eyebrow">Seasonal challenges</h2>{founder && <NewChallenge today={today} />}</div>
      {cards.map(({ c, p, ph }) => {
        const pct = Math.min(100, Math.round((p.total / c.target) * 100));
        const won = p.total >= c.target;
        return (
          <article key={c.id} className={`panel p-5 ${ph === "LIVE" && c.active ? "ring-2 ring-brand/40" : "opacity-90"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xl font-extrabold tracking-tight">{c.title}</div>
                <div className="text-xs font-semibold text-mute">{c.startsOn} to {c.endsOn} · {c.target} {METRIC_LABEL[c.metric]}{c.prize && ` · 🎁 ${c.prize}`}</div>
              </div>
              <span className={`chip ${won ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : ph === "LIVE" && c.active ? "bg-brand/15 text-brand" : "bg-line text-mute"}`}>{won ? "Target reached 🎉" : !c.active ? "Ended" : ph === "UPCOMING" ? "Starts soon" : ph === "ENDED" ? "Finished" : "Live"}</span>
            </div>
            {c.description && <p className="mt-2 text-sm">{c.description}</p>}
            <div className="mt-3 flex items-end gap-3"><span className="text-4xl font-extrabold leading-none">{p.total}</span><span className="pb-0.5 font-bold text-mute">of {c.target}</span></div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.title} progress`}><div className="xp-bar h-full rounded-full" style={{ width: `${Math.max(2, pct)}%` }} /></div>
            {p.top.length > 0 && <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">{p.top.map(([id, n], i) => <span key={id} className="rounded-full bg-line/70 px-3 py-1">{["🥇", "🥈", "🥉"][i]} {names.get(id) ?? "?"} · {n}</span>)}</div>}
            {founder && <div className="mt-3"><ChallengeButtons id={c.id} active={c.active} /></div>}
          </article>
        );
      })}
      {founder && cards.length === 0 && <div className="panel p-6 text-center text-sm font-semibold text-mute">No seasonal challenges yet. Launch one for Diwali, exam season or admission drive.</div>}
    </section>
  );
}
