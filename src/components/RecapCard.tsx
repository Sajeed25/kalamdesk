import type { Recap } from "@/lib/recap";

/** "Your week in numbers": shown Monday to Wednesday on My Day. */
export default function RecapCard({ r }: { r: Recap }) {
  const cheer = r.rank === 1 ? "You topped the board last week! 🏆" : r.rank && r.rank <= 3 ? "On the podium last week! 🥉" : r.completed >= 10 ? "What a week of getting things done! 💪" : "A fresh week, a fresh start. ☀️";
  const tiles: [string, string][] = [
    [String(r.points), "points"], [String(r.completed), "tasks done"], [r.onTimePct === null ? "–" : `${r.onTimePct}%`, "on time"], [String(r.standups), "stand-ups"], [String(r.kudosReceived), "kudos received"],
  ];
  return (
    <section className="panel rise p-5" aria-label="Last week recap">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><div><div className="eyebrow">Your week in numbers · {r.label}</div><div className="mt-1 text-xl font-extrabold tracking-tight">{cheer}</div></div>{r.rank && <span className="chip bg-brand/15 text-brand">Rank {r.rank} of {r.of}</span>}</div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">{tiles.map(([n, l]) => <div key={l} className="rounded-2xl bg-line/50 py-3 text-center"><div className="text-2xl font-extrabold leading-none">{n}</div><div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-mute">{l}</div></div>)}</div>
    </section>
  );
}
