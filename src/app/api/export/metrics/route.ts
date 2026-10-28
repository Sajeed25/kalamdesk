import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isLead } from "@/lib/rbac";
import { HttpError } from "@/lib/tasks";
import { currentRange, inspectableIds, leaderboard, parsePeriod } from "@/lib/metrics";

// Spreadsheet-safe CSV: values starting with = + - @ are prefixed so Excel never runs them as formulas.
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const GET = authed(async (req, u) => {
  if (!isLead(u)) throw new HttpError(403, "Only founders and managers can export");
  const p = new URL(req.url).searchParams;
  const period = parsePeriod(p.get("period") ?? undefined);
  const range = currentRange(period);
  const [emp, intern, scope] = await Promise.all([leaderboard(range, "EMPLOYEE"), leaderboard(range, "INTERN"), inspectableIds(u)]);
  const rows = [...emp, ...intern].filter((r) => scope === "all" || scope.has(r.userId));
  const header = ["Name", "Role", "Department", "Assigned", "Completed", "On-time %", "P1/P2 completion %", "Avg complexity", "Blockers raised", "Recurring compliance %", "Recurring missed", "Points"];
  const lines = [header.map(cell).join(",")].concat(
    rows.map((r) => [r.name, r.role, r.department, r.assigned, r.completed, r.onTimePct, r.p12Rate, r.avgComplexity, r.blockers, r.recurringPct, r.recurringMissed, r.points].map(cell).join(","))
  );
  await db.auditLog.create({ data: { actorId: u.id, action: "EXPORT_METRICS", target: period, meta: `${rows.length} rows` } });
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kalamdesk-${period}-metrics.csv"` },
  });
});
