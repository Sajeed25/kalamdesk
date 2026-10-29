import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskInclude } from "@/lib/tasks";
import { endOfIstDay, startOfIstDay, fmtDateTime, istDateKey } from "@/lib/time";
import { badgeStats, evaluate } from "@/lib/badges";
import { personalGoal } from "@/lib/goals";
import { BadgeWatcher } from "@/components/FunParts";
import { currentRange } from "@/lib/metrics";
import { dailyLine, greeting, levelFor, lifetimePoints, standupStreak } from "@/lib/gamify";
import TaskRow, { PriorityChip, isOverdue } from "@/components/TaskRow";
import CompleteButton from "@/components/CompleteButton";
import ProgressRing from "@/components/ProgressRing";
import PushPrompt from "@/components/PushPrompt";
import Icon from "@/components/Icon";
import { AttendanceCard } from "@/components/LeaveParts";
import RecapCard from "@/components/RecapCard";
import CelebrationBanner from "@/components/CelebrationBanner";
import { celebrationsFor } from "@/lib/celebrations";
import { weeklyRecap } from "@/lib/recap";
import { toIstParts } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function MyDay() {
  const u = await requireUser();
  const now = new Date();
  const end = endOfIstDay(now);
  const mine = { assignees: { some: { userId: u.id } } };

  const [open, doneToday, weekPts, total, streak, wgoal, stats] = await Promise.all([
    db.task.findMany({ where: { ...mine, status: { notIn: ["DONE", "CANCELLED"] } }, include: taskInclude, orderBy: [{ priority: "asc" }, { dueAt: "asc" }] }),
    db.task.count({ where: { ...mine, status: "DONE", completedAt: { gte: startOfIstDay(now) } } }),
    db.scoreEvent.aggregate({ where: { userId: u.id, createdAt: { gte: currentRange("week").from } }, _sum: { points: true } }),
    lifetimePoints(u.id),
    standupStreak(u.id, now),
    personalGoal(u.id),
    badgeStats(u.id, istDateKey(now)),
  ]);
  const attendance = await db.attendanceLog.findUnique({ where: { userId_forDate: { userId: u.id, forDate: istDateKey(now) } } }).catch(() => null);
  const cheers = await celebrationsFor(now);
  const recap = [1, 2, 3].includes(toIstParts(now).dow) ? await weeklyRecap(u.id, u.role).catch(() => null) : null;
  const allBadges = evaluate(stats);
  const earnedBadges = allBadges.filter((b) => b.earned);
  // the closest locked badge: the one you are furthest along towards
  const nextBadge = allBadges.filter((b) => !b.earned).sort((a, b) => b.have / b.need - a.have / a.need)[0];

  const overdue = open.filter((t) => t.dueAt && t.dueAt < now);
  const today = open.filter((t) => t.dueAt && t.dueAt >= now && t.dueAt <= end);
  const upcoming = open.filter((t) => !t.dueAt || t.dueAt > end);
  const remaining = overdue.length + today.length;
  const goal = doneToday + remaining;
  const pct = goal === 0 ? 1 : doneToday / goal;
  const lvl = levelFor(total);
  const focus = overdue[0] ?? today[0] ?? upcoming[0] ?? null;
  const dateLabel = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" }).format(now);

  const mood = goal === 0 ? "A clear day. Plan something great." : remaining === 0 ? "Everything for today is done. Legend." : remaining === 1 ? "One more to go. You've got this." : `${remaining} to go today. One at a time.`;
  const groups = [
    { label: "Overdue", tone: "text-red-600 dark:text-red-400", items: overdue },
    { label: "Due today", tone: "", items: today },
    { label: "Coming up", tone: "", items: upcoming },
  ];
  let n = 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ---------------- hero ---------------- */}
      <section className="hero rise">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 sm:gap-8">
          <div className="min-w-0 max-w-xl">
            <div className="text-sm font-bold uppercase tracking-[0.16em] text-white/80">{dateLabel}</div>
            <h1 className="mt-2 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">{greeting(u.name, now)} 👋</h1>
            <p className="mt-3 text-lg font-semibold text-white/90">{mood}</p>
            <p className="mt-1 text-sm font-medium text-white/75">{dailyLine(now)}</p>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-6 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-white/20 px-3 py-2 text-xs font-extrabold backdrop-blur sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm" title="Consecutive working days with a daily update">
                <span className={streak.count > 0 ? "flame" : ""}><Icon name="flame" className="h-5 w-5" /></span>{streak.count}-day streak
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-white/20 px-3 py-2 text-xs font-extrabold backdrop-blur sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"><Icon name="star" className="h-5 w-5" />{Math.round((weekPts._sum.points ?? 0) * 10) / 10} pts this week</span>
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-white/20 px-3 py-2 text-xs font-extrabold backdrop-blur sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"><Icon name="bolt" className="h-5 w-5" />Lv {lvl.level} {lvl.name}</span>
            </div>
          </div>
          <div className="hidden text-white sm:block">
            <ProgressRing value={pct} size={168} stroke={16} label={`${doneToday} of ${goal} tasks done today`}>
              <span className="text-5xl font-extrabold leading-none">{doneToday}<span className="text-2xl font-bold text-white/70">/{goal}</span></span>
              <span className="mt-1 text-xs font-bold uppercase tracking-widest text-white/80">done today</span>
            </ProgressRing>
          </div>
          <div className="flex w-full items-center gap-4 text-white sm:hidden">
            <ProgressRing value={pct} size={88} stroke={10} label={`${doneToday} of ${goal} tasks done today`}>
              <span className="text-2xl font-extrabold leading-none">{doneToday}<span className="text-sm font-bold text-white/70">/{goal}</span></span>
            </ProgressRing>
            <span className="text-sm font-bold text-white/85">{doneToday} of {goal} tasks done today</span>
          </div>
        </div>
      </section>

      <PushPrompt />

      <CelebrationBanner items={cheers} dayKey={istDateKey(now)} />
      {recap && <RecapCard r={recap} />}
      <AttendanceCard checkIn={attendance?.checkInAt.toISOString() ?? null} checkOut={attendance?.checkOutAt?.toISOString() ?? null} />

      {/* ---------------- stand-up nudge ---------------- */}
      {!streak.doneToday ? (
        <Link href="/update" className="panel panel-hover rise group flex flex-wrap items-center gap-4 p-5 sm:p-6" style={{ ["--i" as string]: 1 }}>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundImage: "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--grad-b)))" }}><Icon name="pencil" className="h-7 w-7" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-extrabold tracking-tight">Your 30-second stand-up</div>
            <div className="text-sm font-semibold text-mute">{streak.atRisk ? `Keep your ${streak.count}-day streak alive: tell us how today went.` : "Tell the team what you finished and what is pending."}</div>
          </div>
          <span className="btn btn-primary group-hover:brightness-110">Fill it in <Icon name="arrow" className="h-4 w-4" /></span>
        </Link>
      ) : (
        <div className="rise flex items-center gap-3 rounded-2xl border border-good/30 bg-good/10 px-5 py-3 text-sm font-bold text-good" style={{ ["--i" as string]: 1 }}>
          <Icon name="check" className="h-5 w-5" strokeWidth={3} />Stand-up filed for today. Streak safe.
        </div>
      )}

      {/* ---------------- weekly goal + badges ---------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/challenges" className="panel panel-hover rise p-5 sm:p-6" style={{ ["--i" as string]: 2 }}>
          <div className="flex items-center justify-between"><span className="eyebrow flex items-center gap-2"><Icon name="target" className="h-4 w-4" />Weekly goal</span><span className="text-xs font-bold text-mute">{wgoal.daysLeft}d left</span></div>
          <div className="mt-2 flex items-baseline gap-2"><span className="stat-value">{wgoal.done}</span><span className="text-xl font-bold text-mute">/ {wgoal.goal} tasks</span></div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-line"><div className="xp-bar h-full rounded-full" style={{ width: `${Math.max(3, Math.round(wgoal.pct * 100))}%` }} /></div>
          <div className="mt-2 text-sm font-semibold text-mute">{wgoal.done >= wgoal.goal ? "Goal smashed! 🎯" : `${wgoal.goal - wgoal.done} more to go`}</div>
        </Link>
        <Link href="/challenges" className="panel panel-hover rise p-5 sm:p-6" style={{ ["--i" as string]: 3 }}>
          <div className="flex items-center justify-between"><span className="eyebrow flex items-center gap-2"><Icon name="star" className="h-4 w-4" />Badges</span><span className="text-xs font-bold text-mute">{earnedBadges.length}/{allBadges.length}</span></div>
          <div className="mt-3 flex flex-wrap gap-2 text-3xl" aria-label={`${earnedBadges.length} badges earned`}>
            {earnedBadges.slice(-5).map((b) => <span key={b.id} title={b.name}>{b.emoji}</span>)}
            {earnedBadges.length === 0 && <span className="text-base font-semibold text-mute">Finish a task to earn your first 🌱</span>}
          </div>
          {nextBadge && <div className="mt-3 text-sm font-semibold text-mute">Next: <b className="text-ink">{nextBadge.emoji} {nextBadge.name}</b> · {nextBadge.have}/{nextBadge.need}</div>}
        </Link>
      </div>
      <BadgeWatcher userId={u.id} earned={earnedBadges.map((b) => ({ id: b.id, emoji: b.emoji, name: b.name }))} goalDone={wgoal.done} goalTarget={wgoal.goal} weekKey={istDateKey(currentRange("week").from)} />

      {/* ---------------- focus ---------------- */}
      {focus && (
        <section className="panel rise relative overflow-hidden p-6 sm:p-8" style={{ ["--i" as string]: 2 }}>
          <div aria-hidden className="absolute inset-y-0 left-0 w-2" style={{ backgroundImage: "linear-gradient(180deg, rgb(var(--grad-a)), rgb(var(--grad-b)))" }} />
          <div className="eyebrow flex items-center gap-2 !text-brand"><Icon name="bolt" className="h-4 w-4" />Focus now</div>
          <Link href={`/tasks/${focus.id}`} className="mt-2 block text-3xl font-extrabold leading-tight tracking-tight hover:text-brand">{focus.title}</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-base text-mute">
            <PriorityChip p={focus.priority} />
            {focus.dueAt && <span className={isOverdue(focus) ? "font-bold text-red-600 dark:text-red-400" : "font-semibold"}>{isOverdue(focus) ? "Overdue · " : "Due "}{fmtDateTime(focus.dueAt)}</span>}
            {focus.location && <span className="font-semibold">📍 {focus.location}</span>}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <CompleteButton id={focus.id} requiresProof={focus.requiresProof} title={focus.title} big />
            <Link href={`/tasks/${focus.id}`} className="btn !min-h-[3.25rem] !px-6 !text-base">Open details</Link>
          </div>
        </section>
      )}

      {/* ---------------- lists ---------------- */}
      {open.length === 0 && (
        <div className="panel rise p-10 text-center" style={{ ["--i" as string]: 3 }}>
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-white" style={{ backgroundImage: "linear-gradient(135deg, rgb(var(--grad-a)), rgb(var(--accent)))", boxShadow: "var(--glow)" }}><Icon name="star" className="h-10 w-10" /></span>
          <p className="mt-5 text-2xl font-extrabold tracking-tight">{doneToday > 0 ? "Inbox zero. You cleared it all!" : "Nothing on your plate yet"}</p>
          <p className="mx-auto mt-2 max-w-md text-base text-mute">Log what you plan to do today with “New task”. It shows up on the founders&apos; desk as self-initiated work, and earns initiative points once accepted.</p>
          <Link href="/tasks/new" className="btn btn-primary mt-6 !min-h-[3.25rem] !px-6 !text-base"><Icon name="plus" className="h-5 w-5" />Plan my day</Link>
        </div>
      )}
      {groups.map((g) =>
        g.items.length ? (
          <section key={g.label} className="space-y-3">
            <h2 className={`eyebrow flex items-center gap-2 ${g.tone}`}>{g.label}<span className="rounded-full bg-line px-2 py-0.5 text-[11px] text-ink">{g.items.length}</span></h2>
            {g.items.map((t) => <TaskRow key={t.id} t={t} canComplete i={n++} />)}
          </section>
        ) : null
      )}
    </div>
  );
}
