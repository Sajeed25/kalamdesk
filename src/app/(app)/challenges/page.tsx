import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { currentRange, leaderboard, previousRange } from "@/lib/metrics";
import { streakFromKeys } from "@/lib/gamify";
import { badgeStats, evaluate } from "@/lib/badges";
import { PERSONAL_MAX, PERSONAL_MIN, personalGoal, TEAM_MAX, TEAM_MIN, teamGoal } from "@/lib/goals";
import { fmtRelative, istDateKey } from "@/lib/time";
import BadgeWall from "@/components/BadgeWall";
import ProgressRing from "@/components/ProgressRing";
import Icon from "@/components/Icon";
import SeasonalChallenges from "@/components/SeasonalChallenges";
import { BadgeWatcher, GoalEditor, KudosBox } from "@/components/FunParts";

export const dynamic = "force-dynamic";

export default async function Challenges() {
  const u = await requireUser();
  const now = new Date();
  const week = currentRange("week");
  const todayKey = istDateKey(now);

  const [mine, team, stats, tasksDone, events, depts, members, updates, people, kudos, stars] = await Promise.all([
    personalGoal(u.id),
    teamGoal(),
    badgeStats(u.id, todayKey),
    db.task.findMany({ where: { status: "DONE", completedAt: { gte: week.from, lt: week.to } }, select: { assignees: { select: { userId: true } } } }),
    db.scoreEvent.findMany({ where: { createdAt: { gte: week.from, lt: week.to } }, select: { points: true, user: { select: { departmentId: true } } } }),
    db.department.findMany(),
    db.user.groupBy({ by: ["departmentId"], where: { active: true, role: { not: "FOUNDER" } }, _count: { _all: true } }),
    db.dailyUpdate.findMany({ where: { forDate: { gte: istDateKey(new Date(now.getTime() - 70 * 864e5)) }, user: { active: true, role: { not: "FOUNDER" } } }, select: { userId: true, forDate: true } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.auditLog.findMany({ where: { action: "KUDOS_SENT" }, orderBy: { createdAt: "desc" }, take: 12, select: { id: true, actorId: true, target: true, meta: true, createdAt: true } }),
    Promise.all([leaderboard(previousRange("weekly"), "EMPLOYEE"), leaderboard(previousRange("weekly"), "INTERN")]),
  ]);

  const name = new Map(people.map((p) => [p.id, p.name]));
  const badges = evaluate(stats);
  const earned = badges.filter((b) => b.earned);

  // this week's MVPs (most tasks completed)
  const doneBy = new Map<string, number>();
  for (const t of tasksDone) for (const a of t.assignees) doneBy.set(a.userId, (doneBy.get(a.userId) ?? 0) + 1);
  const mvps = [...doneBy].sort((a, b) => b[1] - a[1]).slice(0, 3);

  // department race: average points per person this week (fair for small and large teams)
  const pts = new Map<string | null, number>();
  for (const e of events) pts.set(e.user.departmentId, (pts.get(e.user.departmentId) ?? 0) + e.points);
  const headcount = new Map(members.map((m) => [m.departmentId, m._count._all]));
  const race = depts
    .map((d) => ({ name: d.name, color: d.color, people: headcount.get(d.id) ?? 0, total: pts.get(d.id) ?? 0 }))
    .filter((d) => d.people > 0)
    .map((d) => ({ ...d, avg: Math.round((d.total / d.people) * 10) / 10 }))
    .sort((a, b) => b.avg - a.avg);
  const maxAvg = Math.max(1, ...race.map((r) => r.avg));

  // streak board
  const keysBy = new Map<string, Set<string>>();
  for (const x of updates) (keysBy.get(x.userId) ?? keysBy.set(x.userId, new Set()).get(x.userId)!).add(x.forDate);
  const streaks = [...keysBy]
    .map(([id, keys]) => ({ id, ...streakFromKeys(keys, todayKey) }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const star = (rows: typeof stars[0]) => (rows[0] && rows[0].points > 0 ? rows[0] : null);
  const lastWeek = [{ label: "Employee of the week", row: star(stars[0]) }, { label: "Intern of the week", row: star(stars[1]) }];
  const teamPct = Math.round(team.pct * 100);

  return (
    <div className="space-y-8">
      <BadgeWatcher userId={u.id} earned={earned.map((b) => ({ id: b.id, emoji: b.emoji, name: b.name }))} goalDone={mine.done} goalTarget={mine.goal} weekKey={istDateKey(week.from)} />

      <div>
        <div className="eyebrow">Play together</div>
        <h1 className="page-title mt-1">Challenges</h1>
      </div>

      <SeasonalChallenges founder={isFounder(u)} />

      {/* ---- team challenge + personal goal ---- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="hero rise">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-white/85"><Icon name="target" className="h-5 w-5" />Team challenge · this week</div>
            <div className="mt-3 flex flex-wrap items-end gap-x-4">
              <span className="text-6xl font-extrabold leading-none tracking-tight sm:text-7xl">{team.done}</span>
              <span className="pb-1.5 text-2xl font-bold text-white/80">of {team.goal} tasks</span>
            </div>
            <p className="mt-2 text-lg font-semibold text-white/90">
              {team.done >= team.goal ? "Challenge complete! Amazing work, team. 🎉" : `${team.goal - team.done} to go · ${team.daysLeft} day${team.daysLeft === 1 ? "" : "s"} left`}
            </p>
            <div className="mt-5 h-5 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-valuenow={teamPct} aria-valuemin={0} aria-valuemax={100} aria-label="Team challenge progress">
              <div className="h-full rounded-full bg-white shadow-lg transition-all duration-700" style={{ width: `${Math.max(3, teamPct)}%` }} />
            </div>
            {mvps.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-bold">
                <span className="text-white/80">This week&apos;s MVPs:</span>
                {mvps.map(([id, n], i) => <span key={id} className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{["🥇", "🥈", "🥉"][i]} {name.get(id) ?? "?"} · {n}</span>)}
              </div>
            )}
            {isFounder(u) && (
              <div className="mt-4 text-white">
                <GoalEditor endpoint="/api/goals/team" goal={team.goal} custom={team.custom} min={TEAM_MIN} max={TEAM_MAX} label="Team challenge" />
                <span className="ml-3 text-xs font-semibold text-white/70">{team.custom ? "Set by you" : "Automatic: a little above the recent average"}</span>
              </div>
            )}
          </div>
        </section>

        <section className="panel rise flex flex-col items-center justify-center gap-4 p-6 text-center" style={{ ["--i" as string]: 1 }}>
          <div className="eyebrow">Your weekly goal</div>
          <div className="text-brand">
            <ProgressRing value={mine.pct} size={150} stroke={14} label={`${mine.done} of ${mine.goal} tasks this week`}>
              <span className="text-4xl font-extrabold leading-none text-ink">{mine.done}<span className="text-xl font-bold text-mute">/{mine.goal}</span></span>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-widest text-mute">tasks</span>
            </ProgressRing>
          </div>
          <p className="text-sm font-semibold text-mute">{mine.done >= mine.goal ? "Goal smashed! Anything extra is a bonus." : `${mine.goal - mine.done} more to hit it · ${mine.daysLeft} day${mine.daysLeft === 1 ? "" : "s"} left`}</p>
          <div className="text-brand"><GoalEditor endpoint="/api/me/goal" goal={mine.goal} custom={mine.custom} min={PERSONAL_MIN} max={PERSONAL_MAX} label="Your goal" /></div>
          <p className="text-xs font-semibold text-mute">{mine.custom ? "A goal you chose" : "Automatic: stretches you a little beyond your recent weeks"}</p>
        </section>
      </div>

      {/* ---- department race + streak board ---- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="panel rise p-6" style={{ ["--i" as string]: 2 }}>
          <h2 className="section-title flex items-center gap-2"><Icon name="trophy" className="h-5 w-5 text-brand" />Department race</h2>
          <p className="mb-4 text-sm font-semibold text-mute">Average points per person this week, so small teams compete fairly.</p>
          <ol className="space-y-3">
            {race.map((d, i) => (
              <li key={d.name}>
                <div className="flex items-baseline justify-between gap-3 text-sm font-bold"><span className="flex items-center gap-2"><span className="text-mute">{i + 1}</span><span aria-hidden className="h-3 w-3 rounded-full" style={{ background: d.color }} />{d.name}</span><span>{d.avg} <span className="text-xs font-semibold text-mute">avg · {d.people} {d.people === 1 ? "person" : "people"}</span></span></div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full" style={{ width: `${Math.max(3, (d.avg / maxAvg) * 100)}%`, background: d.color }} /></div>
              </li>
            ))}
            {race.length === 0 && <li className="text-sm font-semibold text-mute">No departments have people yet.</li>}
          </ol>
        </section>

        <section className="panel rise p-6" style={{ ["--i" as string]: 3 }}>
          <h2 className="section-title flex items-center gap-2"><Icon name="flame" className="h-5 w-5 text-accent" />Streak board</h2>
          <p className="mb-4 text-sm font-semibold text-mute">Working days in a row with a daily update.</p>
          <ol className="space-y-2">
            {streaks.map((s, i) => (
              <li key={s.id} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${s.id === u.id ? "bg-brand/10" : "bg-line/40"}`}>
                <span className="w-5 text-center text-sm font-extrabold text-mute">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-bold">{name.get(s.id) ?? "?"}{s.id === u.id && <span className="ml-1 text-xs text-mute">(you)</span>}</span>
                <span className={`flex items-center gap-1 text-lg font-extrabold ${s.atRisk ? "text-mute" : "text-accent"}`} title={s.atRisk ? "Update today to keep it alive" : "Alive"}><span className={s.atRisk ? "" : "flame"}><Icon name="flame" className="h-5 w-5" /></span>{s.count}</span>
              </li>
            ))}
            {streaks.length === 0 && <li className="rounded-2xl bg-line/40 p-4 text-sm font-semibold text-mute">No streaks yet. File today&apos;s update and start the board!</li>}
          </ol>
        </section>
      </div>

      {/* ---- last week's stars ---- */}
      <section className="space-y-3">
        <h2 className="section-title">Last week&apos;s stars</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {lastWeek.map((s, i) => (
            <div key={s.label} className="panel rise flex items-center gap-4 p-5" style={{ ["--i" as string]: i + 4 }}>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 text-3xl shadow-lg" aria-hidden>⭐</span>
              <div className="min-w-0">
                <div className="eyebrow">{s.label}</div>
                {s.row ? (<><div className="truncate text-xl font-extrabold tracking-tight">{s.row.name}</div><div className="text-sm font-semibold text-mute">{s.row.points} points · {s.row.department ?? "—"}</div></>) : <div className="text-sm font-semibold text-mute">Nobody scored last week. This week&apos;s yours!</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- badges ---- */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="section-title">Your badges</h2>
          <span className="chip bg-brand/15 !text-sm text-brand">{earned.length} / {badges.length} earned</span>
        </div>
        <BadgeWall badges={badges} />
      </section>

      {/* ---- kudos ---- */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="panel rise p-6" style={{ ["--i" as string]: 5 }}>
          <h2 className="section-title mb-1">Give someone kudos 🙌</h2>
          <p className="mb-4 text-sm font-semibold text-mute">A kind word costs nothing. They&apos;ll get a notification, and it lands on the wall.</p>
          <KudosBox people={people.filter((p) => p.id !== u.id)} />
        </div>
        <div className="panel rise p-6" style={{ ["--i" as string]: 6 }}>
          <h2 className="section-title mb-4">Kudos wall</h2>
          <ul className="space-y-3">
            {kudos.map((k) => (
              <li key={k.id} className="rounded-2xl bg-line/40 p-4">
                <div className="text-sm font-bold"><span className="text-brand">{name.get(k.actorId ?? "") ?? "Someone"}</span> → {name.get(k.target) ?? "a teammate"} <span className="font-semibold text-mute">· {fmtRelative(k.createdAt)}</span></div>
                <div className="mt-1 text-base font-semibold">“{k.meta}”</div>
              </li>
            ))}
            {kudos.length === 0 && <li className="text-sm font-semibold text-mute">No kudos yet. Be the first!</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
