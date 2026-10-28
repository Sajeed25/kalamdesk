import { AsyncLocalStorage } from "async_hooks";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

/**
 * Organisation isolation (Robokalam, Samaritan, Calvings, Nextpreneur ...).
 *
 * Every top-level table carries an orgId. The Prisma client in db.ts consults currentOrgId() before every
 * query and adds "AND orgId = <that organisation>" to reads and writes, and stamps it on creates.
 * So a forgotten filter in a page or API can never leak another organisation's rows.
 *
 *  - Signed in: scoped to the active organisation (a group owner may switch; everybody else is pinned to their own).
 *  - Signed out (login, password reset, public share links, cron): unscoped, because those flows have to look
 *    people up by email or token before any organisation is known. Cron work wraps itself in runInOrg().
 */
export const SESSION_COOKIE = "kd_session";
export const ORG_COOKIE = "kd_org";

const store = new AsyncLocalStorage<{ orgId: string | null }>();

/** Run `fn` with every database call limited to one organisation (null = explicitly unscoped). */
export function runInOrg<T>(orgId: string | null, fn: () => Promise<T>): Promise<T> {
  return store.run({ orgId }, fn);
}

/** Which organisation a session may act in: the group owner's chosen one, otherwise their own. */
export function activeOrgFor(p: Record<string, unknown>, chosen?: string): string | null {
  const home = typeof p.org === "string" ? p.org : null;
  if (p.ao === true && chosen) return chosen;
  return home;
}

function key() {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? new TextEncoder().encode(s) : null;
}

/** null means "do not filter". */
export async function currentOrgId(): Promise<string | null> {
  const s = store.getStore();
  if (s) return s.orgId;
  let token: string | undefined;
  let chosen: string | undefined;
  try {
    const jar = cookies();
    token = jar.get(SESSION_COOKIE)?.value;
    chosen = jar.get(ORG_COOKIE)?.value;
  } catch {
    return null; // not inside a web request (seed, scripts, server start-up)
  }
  const k = key();
  if (!token || !k) return null;
  try {
    const { payload } = await jwtVerify(token, k);
    if (payload.p) return null; // purpose-scoped tokens are not sessions
    return activeOrgFor(payload, chosen);
  } catch {
    return null; // expired or invalid: treated as signed out
  }
}

// ---- which tables are filtered, and how ----

/** Tables with their own orgId column. */
export const DIRECT_MODELS = new Set([
  "User", "Department", "Task", "RecurringRule", "IncentiveRule", "ReferralProgram", "DashboardSnapshot",
  "TaskTemplate", "Challenge", "Lead", "ExpenseClaim", "LeaveRequest", "AttendanceLog", "IdDocument",
  "VisitReport", "PersonDate", "AuditLog",
]);

/** Child tables filtered through their parent's relation. */
export const VIA_RELATION: Record<string, string> = {
  EmployeeProfile: "user", EmployeeSensitive: "user", DailyUpdate: "user", ScoreEvent: "user", IncentiveAward: "user",
  Referral: "referrer",
  TaskAssignee: "task", TaskChecklistItem: "task", TaskComment: "task", TaskAttachment: "task", TaskActivity: "task", TaskInstance: "task",
  LeadCall: "lead",
};
// Not filtered on purpose: Organization, Notification (always personal to a user), PasswordReset, JobRun,
// ScoreSetting, RecoveryCode, CalendarFeed.

/** Reads may also see group owners (they are founders of every organisation); writes may not touch them. */
export function readScope(model: string, orgId: string): Record<string, unknown> | null {
  if (model === "User") return { OR: [{ orgId }, { allOrgs: true }] };
  return writeScope(model, orgId);
}
export function writeScope(model: string, orgId: string): Record<string, unknown> | null {
  if (DIRECT_MODELS.has(model)) return { orgId };
  const rel = VIA_RELATION[model];
  return rel ? { [rel]: { orgId } } : null;
}
