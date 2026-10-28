import { z } from "zod";
import { db } from "./db";
import { istDateKey } from "./time";

import { dateKeySchema } from "./dates";
import { LEAVE_TYPES } from "./leaveMeta";

export { dateKeySchema, LEAVE_TYPES };
export { LEAVE_LABEL } from "./leaveMeta";

export const leaveSchema = z.object({
  type: z.enum(LEAVE_TYPES),
  fromDate: dateKeySchema,
  toDate: dateKeySchema,
  reason: z.string().trim().max(500).optional().default(""),
  backupUserId: z.string().min(1).nullish(),
});

/** Inclusive number of calendar days. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

/** Who is on approved leave on a date, with their cover person. */
export async function awayOn(userIds: string[], date = istDateKey()) {
  if (userIds.length === 0) return new Map<string, { backupUserId: string | null; toDate: string }>();
  const rows = await db.leaveRequest.findMany({
    where: { userId: { in: userIds }, status: "APPROVED", fromDate: { lte: date }, toDate: { gte: date } },
    select: { userId: true, backupUserId: true, toDate: true },
  });
  return new Map(rows.map((r) => [r.userId, { backupUserId: r.backupUserId, toDate: r.toDate }]));
}
