import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { CATEGORY_LABEL, csvCell } from "@/lib/expenses";

// CSV of every claim for the accountant. Founders only.
export const GET = authed(async (_req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can export expenses");
  const rows = await db.expenseClaim.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
  const people = new Map((await db.user.findMany({ select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  const head = ["Date spent", "Person", "What for", "Category", "Amount (INR)", "Status", "Paid on", "Note"];
  const lines = [head.join(","), ...rows.map((r) => [r.spentOn, people.get(r.userId) ?? "", r.title, CATEGORY_LABEL[r.category] ?? r.category, r.amountInr, r.status, r.paidAt ? r.paidAt.toISOString().slice(0, 10) : "", r.decisionNote ?? ""].map(csvCell).join(","))];
  await db.auditLog.create({ data: { actorId: u.id, action: "EXPENSES_EXPORTED", target: u.id, meta: `${rows.length} rows` } });
  return new Response(lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="expenses.csv"', "Cache-Control": "no-store" } });
});
