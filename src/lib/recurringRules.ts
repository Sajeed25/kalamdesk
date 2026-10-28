import { z } from "zod";
import { db } from "./db";
import { isLead } from "./rbac";
import { assertDepartment } from "./orgGuard";
import { teamIds, HttpError } from "./tasks";
import { buildRRule, parseRRule } from "./recurrence";
import { PRIORITIES } from "./constants";
import type { SessionUser } from "./auth";

export const ruleSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  freq: z.enum(["DAILY", "WEEKDAYS", "WEEKLY", "MONTHLY"]),
  days: z.array(z.number().int().min(0).max(6)).default([]),
  monthDay: z.number().int().min(1).max(31).default(1),
  time: z.string().regex(/^\d{1,2}:\d{2}$/, "Time must look like 10:00"),
  leadHours: z.number().int().min(1).max(72).default(12),
  priority: z.enum(PRIORITIES).default("P3"),
  location: z.string().trim().max(300).nullish(),
  departmentId: z.string().nullish(),
  assigneeIds: z.array(z.string()).min(1, "Choose at least one person"),
});
export type RuleInput = z.infer<typeof ruleSchema>;

/** Validates the schedule and (for managers) that everyone assigned is on their team. */
export async function prepareRule(u: SessionUser, input: RuleInput) {
  if (!isLead(u)) throw new HttpError(403, "Only founders and managers can manage recurring activities");
  const rrule = buildRRule({ freq: input.freq, days: input.days, monthDay: input.monthDay, time: input.time });
  if (!parseRRule(rrule)) throw new HttpError(400, input.freq === "WEEKLY" ? "Pick at least one weekday" : "Invalid schedule");
  const ids = Array.from(new Set(input.assigneeIds));
  const found = await db.user.count({ where: { id: { in: ids }, active: true } });
  if (found !== ids.length) throw new HttpError(400, "Unknown or inactive assignee");
  await assertDepartment(input.departmentId);
  if (u.role === "MANAGER") {
    const allowed = new Set([u.id, ...(await teamIds(u.id))]);
    if (ids.some((i) => !allowed.has(i))) throw new HttpError(403, "Managers can only assign recurring work to their own team");
  }
  return {
    title: input.title, description: input.description, rrule, leadHours: input.leadHours, priority: input.priority,
    location: input.location || null, departmentId: input.departmentId || null, assigneeIds: ids.join(","),
  };
}
