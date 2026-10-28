import { db } from "@/lib/db";
import { appUrl } from "@/lib/email";
import { buildCalendar, userIdFromToken, verifyToken } from "@/lib/ics";

// Public by design (calendar apps cannot sign in) but unguessable and revocable: the token is an HMAC of the person's
// id + a secret salt. Wrong, expired or revoked tokens all look identical: a plain 404.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const notFound = () => new Response("Not found", { status: 404 });
  const userId = userIdFromToken(params.token);
  if (!userId) return notFound();
  const [feed, user] = await Promise.all([db.calendarFeed.findUnique({ where: { userId } }), db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, active: true } })]);
  if (!feed || !user?.active || !verifyToken(params.token, feed.salt)) return notFound();

  const now = Date.now();
  const tasks = await db.task.findMany({
    where: { assignees: { some: { userId } }, status: { notIn: ["DONE", "CANCELLED"] }, dueAt: { gte: new Date(now - 7 * 864e5), lte: new Date(now + 120 * 864e5) } },
    select: { id: true, title: true, priority: true, dueAt: true, location: true, description: true, status: true },
    orderBy: { dueAt: "asc" }, take: 500,
  });
  const ics = buildCalendar(`KalamDesk: ${user.name}`, tasks.map((t) => ({
    uid: t.id, title: `[${t.priority}] ${t.title}`, start: t.dueAt!, location: t.location, priority: t.priority,
    description: `${t.status === "BLOCKED" ? "BLOCKED. " : ""}${t.description}`.slice(0, 400), url: appUrl(`/tasks/${t.id}`),
  })));
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
}
