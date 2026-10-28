import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/api";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

// Run every 15 min. "Due in 2 hours" and "overdue" nudges; JobRun makes each fire once per task.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const soon = new Date(now.getTime() + 2 * 3600 * 1000);
  const open = { status: { notIn: ["DONE", "CANCELLED"] } };
  const dueSoon = await db.task.findMany({ where: { ...open, dueAt: { gt: now, lte: soon } }, include: { assignees: true } });
  const overdue = await db.task.findMany({ where: { ...open, dueAt: { lt: now } }, include: { assignees: true } });

  let sent = 0;
  const fire = async (kind: string, t: (typeof dueSoon)[number], title: string) => {
    try {
      await db.jobRun.create({ data: { kind, key: t.id } });
    } catch {
      return; // already sent
    }
    for (const a of t.assignees) {
      await notify({ userId: a.userId, kind: "REMINDER", title, body: t.title, url: `/tasks/${t.id}` });
      sent++;
    }
  };
  for (const t of dueSoon) await fire("remind-2h", t, `Due within 2 hours: ${t.title}`);
  for (const t of overdue) await fire("remind-overdue", t, `Overdue: ${t.title}`);
  return NextResponse.json({ sent });
}
