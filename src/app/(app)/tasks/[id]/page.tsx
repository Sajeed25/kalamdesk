import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskInclude, visibleWhere } from "@/lib/tasks";
import { canAssignOthers, canReview } from "@/lib/rbac";
import { fmtDateTime } from "@/lib/time";
import { PRIORITY_LABEL } from "@/lib/constants";
import StatusMenu from "@/components/StatusMenu";
import TaskActions from "@/components/TaskActions";
import ChecklistAndFiles from "@/components/ChecklistAndFiles";
import EditTask from "@/components/EditTask";
import CheckIn from "@/components/CheckIn";
import { toIstInputValue } from "@/lib/time";
import { PriorityChip, isOverdue } from "@/components/TaskRow";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: { id: string } }) {
  const u = await requireUser();
  const t = await db.task.findFirst({
    where: { AND: [{ id: params.id }, await visibleWhere(u)] },
    include: {
      ...taskInclude,
      comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      activity: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      checklist: { orderBy: { position: "asc" } },
      attachments: { orderBy: { createdAt: "asc" } },
      instances: true,
    },
  });
  if (!t) notFound();
  const mayChangeStatus = canReview(u) || t.assignees.some((a) => a.userId === u.id);
  const canEdit = canReview(u) || t.creatorId === u.id || t.assignees.some((a) => a.userId === u.id);
  const canEditFields = canReview(u) || t.creatorId === u.id;
  const people = canAssignOthers(u) ? await db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/my-day" className="text-sm text-mute hover:underline">← Back</Link>
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <PriorityChip p={t.priority} />
          <span className="text-mute">{PRIORITY_LABEL[t.priority]} · complexity {t.complexity}/5</span>
          {t.selfInitiated && <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">Self-initiated{t.initiativeAccepted ? " · accepted" : ""}</span>}
          {t.department && <span className="chip bg-line">{t.department.name}</span>}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="page-title">{t.title}</h1>
        </div>
      </div>

      <dl className="panel grid grid-cols-[8rem_1fr] gap-y-2 p-4 text-sm">
        <dt className="text-mute">Status</dt>
        <dd>{mayChangeStatus ? <StatusMenu id={t.id} status={t.status} requiresProof={t.requiresProof} /> : t.status}</dd>
        <dt className="text-mute">Assigned to</dt><dd>{t.assignees.map((a) => a.user.name).join(", ")}</dd>
        <dt className="text-mute">Created by</dt><dd>{t.creator.name}</dd>
        <dt className="text-mute">Due</dt><dd className={isOverdue(t) ? "font-semibold text-red-600" : ""}>{t.dueAt ? fmtDateTime(t.dueAt) : "No due date"}</dd>
        {t.location && (<><dt className="text-mute">Location</dt><dd>{t.location}</dd></>)}
        {t.status === "BLOCKED" && (<><dt className="text-mute">Blocked because</dt><dd className="text-amber-600">{t.blockedReason}</dd></>)}
        {t.requiresProof && (<><dt className="text-mute">Proof</dt><dd>{t.proofNote ?? "Required before Done"}</dd></>)}
        {t.reviewState && (<><dt className="text-mute">Review</dt><dd>{t.reviewState === "APPROVED" ? "Approved" : "Sent back"}</dd></>)}
      </dl>

      {canEditFields && <EditTask task={{ id: t.id, title: t.title, description: t.description, priority: t.priority, complexity: t.complexity, dueInput: toIstInputValue(t.dueAt), assigneeIds: t.assignees.map((a) => a.userId) }} people={people} canAssign={canAssignOthers(u)} />}

      {t.description && <p className="whitespace-pre-wrap text-sm">{t.description}</p>}

      {t.instances[0] && (
        <CheckIn
          instanceId={t.instances[0].id}
          checkedInAt={t.instances[0].checkInAt?.toISOString() ?? null}
          outcome={t.instances[0].outcome}
          canCheckIn={t.assignees.some((a) => a.userId === u.id)}
        />
      )}

      <ChecklistAndFiles taskId={t.id} canEdit={canEdit} items={t.checklist} files={t.attachments.map((a) => ({ id: a.id, fileName: a.fileName, sizeBytes: a.sizeBytes }))} />

      <TaskActions id={t.id} canReview={canReview(u)} inReview={t.status === "IN_REVIEW"} selfInitiated={t.selfInitiated} accepted={t.initiativeAccepted} />

      <section>
        <h2 className="mb-2 eyebrow">Comments</h2>
        <ul className="space-y-2">
          {t.comments.map((c) => (
            <li key={c.id} className="panel p-3 text-sm"><b>{c.author.name}</b> <span className="text-xs text-mute">{fmtDateTime(c.createdAt)}</span><p className="mt-1 whitespace-pre-wrap">{c.body}</p></li>
          ))}
          {t.comments.length === 0 && <li className="text-sm text-mute">No comments yet.</li>}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 eyebrow">Activity</h2>
        <ul className="space-y-1 text-sm text-mute">
          {t.activity.map((a) => (
            <li key={a.id}>{fmtDateTime(a.createdAt)} · {a.actor.name} · {a.action.toLowerCase()} {a.detail}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
