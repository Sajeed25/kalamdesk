"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { BOARD_STATUSES, PRIORITY_BAR, STATUS_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/time";
import { changeStatus } from "./StatusMenu";
import { PriorityChip } from "./TaskRow";

export type BoardTask = {
  id: string; title: string; priority: string; status: string; dueAt: string | null;
  overdue: boolean; requiresProof: boolean; selfInitiated: boolean; assignees: string[]; blockedReason: string | null;
};

function Card({ t }: { t: BoardTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: t.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`panel cursor-grab touch-none border-l-4 p-3 text-sm shadow-sm ${PRIORITY_BAR[t.priority]} ${t.overdue ? "overdue-pulse" : ""} ${isDragging ? "z-10 opacity-80 shadow-xl" : ""}`}>
      <Link href={`/tasks/${t.id}`} onPointerDown={(e) => e.stopPropagation()} className="font-medium hover:underline">{t.title}</Link>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-mute">
        <PriorityChip p={t.priority} />
        {t.dueAt && <span className={t.overdue ? "font-semibold text-red-600" : ""}>{fmtDateTime(t.dueAt)}</span>}
        {t.selfInitiated && <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">Self</span>}
      </div>
      <div className="mt-1 text-xs text-mute">{t.assignees.join(", ")}</div>
      {t.status === "BLOCKED" && t.blockedReason && <div className="mt-1 text-xs text-amber-600">⚠ {t.blockedReason}</div>}
    </div>
  );
}

function Column({ status, tasks }: { status: string; tasks: BoardTask[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`w-72 shrink-0 rounded-xl bg-line/30 p-2 ${isOver ? "ring-2 ring-brand/50" : ""}`}>
      <h3 className="px-2 py-1 text-sm font-semibold">{STATUS_LABEL[status]} <span className="text-mute">{tasks.length}</span></h3>
      <div className="min-h-16 space-y-2">
        {tasks.map((t) => <Card key={t.id} t={t} />)}
        {tasks.length === 0 && <p className="px-2 py-3 text-xs text-mute">Drop a card here</p>}
      </div>
    </div>
  );
}

export default function KanbanBoard({ initial }: { initial: BoardTask[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const [err, setErr] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
  );

  async function onDragEnd(e: DragEndEvent) {
    const to = e.over?.id as string | undefined;
    const t = tasks.find((x) => x.id === e.active.id);
    if (!to || !t || t.status === to) return;
    const prev = tasks;
    setTasks(tasks.map((x) => (x.id === t.id ? { ...x, status: to } : x))); // optimistic
    const problem = await changeStatus(t.id, to, t.requiresProof);
    if (problem) {
      setTasks(prev); // roll back
      setErr(problem);
    } else setErr("");
    router.refresh();
  }

  return (
    <>
      {err && <p role="alert" className="mb-2 text-sm text-red-600">{err}</p>}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {BOARD_STATUSES.map((s) => <Column key={s} status={s} tasks={tasks.filter((t) => t.status === s)} />)}
        </div>
      </DndContext>
    </>
  );
}
