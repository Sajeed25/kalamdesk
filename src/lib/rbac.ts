import type { Role } from "./constants";

type U = { id: string; role: Role };

export const isFounder = (u: U) => u.role === "FOUNDER";
export const isLead = (u: U) => u.role === "FOUNDER" || u.role === "MANAGER";

/** Who may be assigned work by this user. Employees/interns may only self-assign or *request*. */
export const canAssignOthers = isLead;
/** Founder's Desk + per-person boards: leads only (managers are scoped to their team in queries). */
export const canViewTeam = isLead;
/** Review actions (approve / send back / rate). */
export const canReview = isLead;
/** Bank / ID data. Never exposed to anyone but FOUNDER — enforced again at the API layer (Phase 3). */
export const canSeeSensitive = isFounder;

/** Can this user see a given task? Own/assigned/created, or a lead (managers: own team only). */
export function canViewTask(
  u: U,
  task: { creatorId: string; assigneeIds: string[] },
  teamIds?: Set<string>
) {
  if (u.role === "FOUNDER") return true;
  if (task.creatorId === u.id || task.assigneeIds.includes(u.id)) return true;
  if (u.role === "MANAGER" && teamIds) return task.assigneeIds.some((a) => teamIds.has(a));
  return false;
}
