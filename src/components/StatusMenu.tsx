"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUSES, STATUS_LABEL } from "@/lib/constants";

/** Shared client helper: PATCH a task, asking for a reason/proof when the rules require it. */
export async function changeStatus(id: string, status: string, requiresProof = false): Promise<string | null> {
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
  return res.ok ? null : (await res.json()).error ?? "Could not update";
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
      <select value={status} onChange={onChange} className="input !w-auto !py-1 text-xs" aria-label="Status">
        {STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
        ))}
      </select>
      {err && <span role="alert" className="ml-2 text-xs text-red-600">{err}</span>}
    </span>
  );
}
