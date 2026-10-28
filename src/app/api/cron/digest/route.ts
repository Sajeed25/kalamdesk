import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/api";
import { db } from "@/lib/db";
import { sendEmail, emailTemplate, appUrl, escapeHtml } from "@/lib/email";
import { deskSummaries } from "@/lib/desk";
import { endOfIstDay, istDateKey, startOfIstDay } from "@/lib/time";

// Schedule at 13:30 UTC (= 7:00 PM IST) daily for the founder digest, and 03:00 UTC (= 8:30 AM IST)
// with ?type=morning for assignee digests. Idempotent per day via JobRun.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = new URL(req.url).searchParams.get("type") === "morning" ? "morning" : "evening";
  const key = istDateKey();
  try {
    await db.jobRun.create({ data: { kind: `digest-${type}`, key } });
  } catch {
    return NextResponse.json({ skipped: "already ran today" });
  }
  const now = new Date();
  const from = startOfIstDay(now);

  if (type === "morning") {
    const users = await db.user.findMany({ where: { active: true } });
    let sent = 0;
    for (const u of users) {
      const tasks = await db.task.findMany({
        where: { assignees: { some: { userId: u.id } }, status: { notIn: ["DONE", "CANCELLED"] }, dueAt: { lte: endOfIstDay(now) } },
        orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
      });
      if (!tasks.length) continue;
      const lines = tasks.map((t) => `${t.dueAt! < now ? "⚠ Overdue · " : ""}<b>${t.priority}</b> ${escapeHtml(t.title)}`);
      await sendEmail(u.email, `Your day: ${tasks.length} task${tasks.length > 1 ? "s" : ""} due`, emailTemplate({ heading: `Good morning, ${u.name.split(" ")[0]}`, lines, ctaLabel: "Open My Day", ctaUrl: appUrl("/my-day") }));
      sent++;
    }
    return NextResponse.json({ type, sent });
  }

  const obstacles = await db.dailyUpdate.findMany({ where: { forDate: key, NOT: { obstacles: "" } }, include: { user: { select: { name: true } } } });
  const [doneToday, summaries, founders] = await Promise.all([
    db.task.findMany({ where: { completedAt: { gte: from } }, include: { assignees: { include: { user: true } } } }),
    deskSummaries({ id: "", role: "FOUNDER" } as never),
    db.user.findMany({ where: { role: "FOUNDER", active: true } }),
  ]);
  const lines = [
    `<b>Done today:</b> ${doneToday.length}`,
    `<b>Overdue:</b> ${summaries.reduce((s, p) => s + p.overdue, 0)} across ${summaries.filter((p) => p.overdue).length} people`,
    `<b>Blocked:</b> ${summaries.filter((p) => p.blocked).map((p) => `${escapeHtml(p.name)} (${p.blocked})`).join(", ") || "none"}`,
    `<b>No stand-up today:</b> ${summaries.filter((p) => !p.updatedToday).map((p) => escapeHtml(p.name)).join(", ") || "everyone submitted"}`,
    `<b>Obstacles reported:</b> ${obstacles.map((o) => `${escapeHtml(o.user.name)}: ${escapeHtml(o.obstacles.slice(0, 120))}`).join("<br>") || "none"}`,
  ];
  for (const f of founders) {
    await sendEmail(f.email, `Daily digest · ${key}`, emailTemplate({ heading: "Today at Robokalam", lines, ctaLabel: "Open Founder's Desk", ctaUrl: appUrl("/desk") }));
  }
  return NextResponse.json({ type, founders: founders.length });
}
