import Link from "next/link";
import { PRIORITY_CLASS, STATUS_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/time";
import type { TaskCard } from "@/lib/tasks";
import StatusMenu from "./StatusMenu";
import CompleteButton from "./CompleteButton";

export function isOverdue(t: { status: string; dueAt: Date | null }) {
  return !!t.dueAt && t.dueAt < new Date() && t.status !== "DONE" && t.status !== "CANCELLED";
}

export function PriorityChip({ p }: { p: string }) {
  return <span className={`chip ${PRIORITY_CLASS[p]}`}>{p}</span>;
}

const BAR: Record<string, string> = { P1: "bg-red-500", P2: "bg-orange-500", P3: "bg-blue-500", P4: "bg-slate-400" };

/** Task card used on My Day and the person pages. `canComplete` adds the one-tap check button. */
export default function TaskRow({ t, showAssignee = false, canComplete = false, i = 0 }: { t: TaskCard; showAssignee?: boolean; canComplete?: boolean; i?: number }) {
  const over = isOverdue(t);
  const open = t.status !== "DONE" && t.status !== "CANCELLED";
  return (
    <div className={`panel panel-hover rise flex flex-wrap items-center gap-4 p-4 sm:p-5 ${over ? "overdue-pulse" : ""}`} style={{ ["--i" as string]: Math.min(i, 8) }}>
      <span aria-hidden className={`w-1.5 self-stretch rounded-full ${BAR[t.priority]}`} />
      {canComplete && open && <CompleteButton id={t.id} requiresProof={t.requiresProof} title={t.title} />}
      <div className="min-w-0 flex-1">
        <Link href={`/tasks/${t.id}`} className={`block text-lg font-bold leading-snug tracking-tight hover:text-brand ${t.status === "DONE" ? "text-mute line-through" : ""}`}>{t.title}</Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-mute">
          <PriorityChip p={t.priority} />
          {t.dueAt && <span className={over ? "font-bold text-red-600 dark:text-red-400" : "font-semibold"}>{over ? "Overdue · " : "Due "}{fmtDateTime(t.dueAt)}</span>}
          {t.department && <span className="font-semibold">{t.department.name}</span>}
          {t.selfInitiated && <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">Self-initiated</span>}
          {t.creator.id !== t.assignees[0]?.userId && <span>from {t.creator.name}</span>}
          {showAssignee && <span>→ {t.assignees.map((a) => a.user.name).join(", ")}</span>}
          {t.status === "BLOCKED" && <span className="font-semibold text-amber-600 dark:text-amber-400">Blocked: {t.blockedReason}</span>}
        </div>
      </div>
      <StatusMenu id={t.id} status={t.status} requiresProof={t.requiresProof} />
    </div>
  );
}

export { STATUS_LABEL };
