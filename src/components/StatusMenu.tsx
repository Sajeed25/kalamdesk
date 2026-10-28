"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUSES, STATUS_LABEL } from "@/lib/constants";
import { confetti, doneMessage, toast } from "@/lib/celebrate";

/** Shared client helper: PATCH a task, asking for a reason/proof when the rules require it. */
export async function changeStatus(id: string, status: string, requiresProof = false, origin?: { x: number; y: number }): Promise<string | null> {
  const body: Record<string, unknown> = { status };
  if (status === "BLOCKED") {
    const reason = window.prompt("What is blocking you? (required)");
    if (!reason?.trim()) return "A reason is required to mark a task Blocked.";
    body.blockedReason = reason.trim();
  }
  if (status === "DONE" && requiresProof) {
    const note = window.prompt("Add proof (a note or link) to mark this Done");
    if (!note?.trim()) return "Proof is required for this task.";
    body.proofNote = note.trim();
  }
  const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) return d.error ?? "Could not update";
  if (status === "DONE") {
    // every route to Done (dropdown, drag, check button) celebrates the same way
    confetti(origin);
    toast(doneMessage(d.points ?? 0));
  }
  return null;
}

export default function StatusMenu({ id, status, requiresProof = false }: { id: string; status: string; requiresProof?: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const e2 = await changeStatus(id, e.target.value, requiresProof);
    setErr(e2 ?? "");
    router.refresh();
  }
  return (
    <span>
      <select value={status} onChange={onChange} className="input !w-auto !rounded-xl !py-2 !text-sm font-semibold" aria-label="Status">
        {STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
        ))}
      </select>
      {err && <span role="alert" className="ml-2 text-xs text-red-600">{err}</span>}
    </span>
  );
}
