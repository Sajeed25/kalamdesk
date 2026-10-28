import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/api";
import { db } from "@/lib/db";
import { appUrl, emailTemplate, escapeHtml, sendEmail } from "@/lib/email";
import { istDateKey } from "@/lib/time";
import { leaderboard, previousRange } from "@/lib/metrics";

// Monday 9 AM IST (?type=weekly) and the 1st of the month (?type=monthly). One email per person
// per period (JobRun guard). Emails carry performance numbers only, never bank/ID data.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = new URL(req.url).searchParams.get("type") === "monthly" ? "monthly" : "weekly";
  const range = previousRange(type);
  try {
    await db.jobRun.create({ data: { kind: `summary-${type}`, key: istDateKey(range.from) } });
  } catch {
    return NextResponse.json({ skipped: "already sent for this period" });
  }

  const [employees, interns, founders] = await Promise.all([
    leaderboard(range, "EMPLOYEE"),
    leaderboard(range, "INTERN"),
    db.user.findMany({ where: { role: "FOUNDER", active: true } }),
  ]);
  const users = await db.user.findMany({ where: { active: true } });
  const emailOf = new Map(users.map((u) => [u.id, u.email]));
  const name = type === "weekly" ? "week" : "month";
  let sent = 0;

  for (const [group, rows] of [["employees", employees], ["interns", interns]] as const) {
    for (const [i, r] of rows.entries()) {
      const to = emailOf.get(r.userId);
      if (!to) continue;
      const lines = [
        `<b>Points:</b> ${r.points} (rank ${i + 1} of ${rows.length} among ${group})`,
        `<b>Tasks:</b> ${r.completed} completed of ${r.assigned} assigned`,
        `<b>On time:</b> ${r.onTimePct === null ? "n/a" : r.onTimePct + "%"}`,
        `<b>Recurring activities:</b> ${r.recurringPct === null ? "n/a" : r.recurringPct + "% done" + (r.recurringMissed ? `, ${r.recurringMissed} missed` : "")}`,
      ];
      await sendEmail(to, `Your ${name} at Robokalam: ${r.points} points`, emailTemplate({ heading: `Your ${name} in numbers`, lines, ctaLabel: "See the leaderboard", ctaUrl: appUrl("/leaderboard") }));
      sent++;
    }
  }

  const top = (rows: typeof employees) => rows.slice(0, 5).map((r, i) => `${i + 1}. ${escapeHtml(r.name)}: ${r.points} pts`).join("<br>") || "none";
  const all = [...employees, ...interns];
  const summary = [
    `<b>Completed:</b> ${all.reduce((s, r) => s + r.completed, 0)} of ${all.reduce((s, r) => s + r.assigned, 0)} assigned`,
    `<b>Top employees</b><br>${top(employees)}`,
    `<b>Top interns</b><br>${top(interns)}`,
  ];
  for (const f of founders)
    await sendEmail(f.email, `Team ${name} summary`, emailTemplate({ heading: `Team summary: ${range.label.toLowerCase()}`, lines: summary, ctaLabel: "Open dashboard", ctaUrl: appUrl("/dashboard") }));

  return NextResponse.json({ type, people: sent, founders: founders.length });
}
