export const VISIT_OUTCOMES: { id: string; label: string; cls: string }[] = [
  { id: "GREAT", label: "Great", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  { id: "GOOD", label: "Good", cls: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  { id: "NEEDS_FOLLOW_UP", label: "Needs follow-up", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  { id: "PROBLEM", label: "Problem", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
];

/** What kind of field activity the report is about. */
export const REPORT_KINDS: { id: string; label: string; short: string; noun: string }[] = [
  { id: "VISIT", label: "School visit", short: "Visit", noun: "visit" },
  { id: "SESSION", label: "Training session", short: "Session", noun: "session" },
  { id: "WORKSHOP", label: "Workshop", short: "Workshop", noun: "workshop" },
];
export const kindOf = (id: string) => REPORT_KINDS.find((k) => k.id === id) ?? REPORT_KINDS[0];

/** Guess the kind from the task title so people rarely need to change it. */
export const guessKind = (title: string) => (/workshop/i.test(title) ? "WORKSHOP" : /(training|session|class|bootcamp|camp)/i.test(title) ? "SESSION" : "VISIT");
