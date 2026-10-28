export const STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE", "CANCELLED"] as const;
export type Status = (typeof STATUSES)[number];
export const BOARD_STATUSES: Status[] = ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE"];
export const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  IN_REVIEW: "In Review",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export const PRIORITY_LABEL: Record<string, string> = {
  P1: "P1 Urgent",
  P2: "P2 High",
  P3: "P3 Normal",
  P4: "P4 When free",
};
// Colour language: P1 red, P2 orange, P3 blue, P4 grey
export const PRIORITY_CLASS: Record<string, string> = {
  P1: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  P2: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  P3: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  P4: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
export const PRIORITY_BAR: Record<string, string> = {
  P1: "border-l-red-500",
  P2: "border-l-orange-500",
  P3: "border-l-blue-500",
  P4: "border-l-slate-400",
};

export const ROLES = ["FOUNDER", "MANAGER", "EMPLOYEE", "INTERN"] as const;
export type Role = (typeof ROLES)[number];

export const DEPARTMENTS = ["Accounts", "BD", "Marketing", "Training", "Product", "HR", "Tech"];
export const OFFICES = ["Hyderabad", "Warangal"];
export const TZ = "Asia/Kolkata";
