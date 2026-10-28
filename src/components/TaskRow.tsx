import Link from "next/link";
import { PRIORITY_BAR, PRIORITY_CLASS, STATUS_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/time";
import type { TaskCard } from "@/lib/tasks";
import StatusMenu from "./StatusMenu";

export function isOverdue(t: { status: string; dueAt: Date | null }) {
  return !!t.dueAt && t.dueAt < new Date() && t.status !== "DONE" && t.status !== "CANCELLED";
}

export function PriorityChip({ p }: { p: string }) {
  return <span className={`chip ${PRIORITY_CLASS[p]}`}>{p}</span>;
}

/** Row used on My Day and the person pages. */
export default function TaskRow({ t, showAssignee = false }: { t: TaskCard; showAssignee?: boolean }) {
  const over = isOverdue(t);
  return (
    <div className={`panel flex flex-wrap items-center gap-3 border-l-4 p-3 ${PRIORITY_BAR[t.priority]} ${over ? "overdue-pulse" : ""}`}>
      <div className="min-w-0 flex-1">
        <Link href={`/tasks/${t.id}`} className="font-medium hover:underline">{t.title}</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mute">
          <PriorityChip p={t.priority} />
          {t.dueAt && <span className={over ? "font-semibold text-red-600" : ""}>{over ? "Overdue · " : "Due "}{fmtDateTime(t.dueAt)}</span>}
          {t.department && <span>{t.department.name}</span>}
          {t.selfInitiated && <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">Self-initiated</span>}
          {t.creator.id !== t.assignees[0]?.userId && <span>from {t.creator.name}</span>}
          {showAssignee && <span>→ {t.assignees.map((a) => a.user.name).join(", ")}</span>}
          {t.status === "BLOCKED" && <span className="text-amber-600">Blocked: {t.blockedReason}</span>}
        </div>
      </div>
      <StatusMenu id={t.id} status={t.status} requiresProof={t.requiresProof} />
    </div>
  );
}

export { STATUS_LABEL };
