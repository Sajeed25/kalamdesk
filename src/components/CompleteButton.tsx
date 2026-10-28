"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Icon from "./Icon";
import { changeStatus } from "./StatusMenu";

/** One-tap "done". Celebrates with confetti and a points toast (see changeStatus). */
export default function CompleteButton({ id, requiresProof = false, title, big = false }: { id: string; requiresProof?: boolean; title: string; big?: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function done() {
    setBusy(true); setErr("");
    const r = ref.current?.getBoundingClientRect();
    const problem = await changeStatus(id, "DONE", requiresProof, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
    setBusy(false);
    if (problem) return setErr(problem);
    router.refresh();
  }

  if (big)
    return (
      <span>
        <button ref={ref} onClick={done} disabled={busy} className="btn btn-primary !min-h-[3.25rem] !px-6 !text-base">
          <Icon name="check" className="h-5 w-5" strokeWidth={3} />{busy ? "Saving…" : "Mark done"}
        </button>
        {err && <span role="alert" className="mt-1 block text-sm font-semibold text-red-600">{err}</span>}
      </span>
    );
  return (
    <span className="shrink-0">
      <button ref={ref} onClick={done} disabled={busy} aria-label={`Mark "${title}" as done`} title="Mark as done"
        className="group/c flex h-12 w-12 items-center justify-center rounded-full border-2 border-line bg-card text-transparent transition duration-200 hover:scale-110 hover:border-transparent hover:text-white active:scale-95 disabled:opacity-60"
        style={{ ["--tw-shadow" as string]: "none" }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundImage = "linear-gradient(135deg, rgb(var(--grad-a)), rgb(var(--grad-b)))"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundImage = ""; }}>
        {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" /> : <Icon name="check" className="h-6 w-6" strokeWidth={3} />}
      </button>
      {err && <span role="alert" className="sr-only">{err}</span>}
    </span>
  );
}
