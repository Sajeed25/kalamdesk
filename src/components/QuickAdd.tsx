"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseQuickAdd } from "@/lib/quickadd";
import { fmtDateTime } from "@/lib/time";

type Person = { id: string; name: string };

export default function QuickAdd({ people, meId, canAssign }: { people: Person[]; meId: string; canAssign: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
      if (!typing && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const openIt = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("kd:quickadd", openIt);
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setOpen(true);
      window.history.replaceState(null, "", window.location.pathname); // so a refresh does not reopen it
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("kd:quickadd", openIt);
    };
  }, []);
  useEffect(() => {
    if (open) setTimeout(() => ref.current?.focus(), 30);
  }, [open]);

  const parsed = parseQuickAdd(text);
  const token = parsed.assigneeToken?.toLowerCase();
  const match = token ? people.find((p) => p.name.toLowerCase().split(" ").some((w) => w.startsWith(token))) : undefined;
  const unknownAssignee = !!token && !match;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.title || unknownAssignee) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: parsed.title,
        priority: parsed.priority ?? "P3",
        dueAt: parsed.dueAt?.toISOString() ?? null,
        assigneeIds: [match?.id ?? meId],
      }),
    });
    setBusy(false);
    if (!res.ok) return setErr((await res.json()).error ?? "Could not create task");
    setText("");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary max-md:!hidden" title="Press N">+ New task</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24" onClick={() => setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="panel w-full max-w-xl space-y-3 p-4 shadow-2xl">
            <input ref={ref} value={text} onChange={(e) => setText(e.target.value)} className="input text-base" placeholder="Raise invoice for Sunrise School @Pooja P1 tomorrow 5pm" />
            <div className="flex min-h-6 flex-wrap items-center gap-2 text-xs">
              {parsed.title && <span className="chip bg-line">Task: {parsed.title}</span>}
              <span className="chip bg-line">For: {match ? match.name : unknownAssignee ? `no one matches @${parsed.assigneeToken}` : "me"}</span>
              <span className="chip bg-line">{parsed.priority ?? "P3"}</span>
              {parsed.dueAt && <span className="chip bg-line">Due {fmtDateTime(parsed.dueAt)}</span>}
            </div>
            {!canAssign && match && match.id !== meId && <p className="text-xs text-mute">This goes to {match.name} as a request from you.</p>}
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex items-center justify-between gap-2 text-xs text-mute">
              <span>@name · P1–P4 · today / tomorrow / tue · 5pm · <a href="/tasks/new" className="underline">full form</a></span>
              <button disabled={busy || !parsed.title || unknownAssignee} className="btn btn-primary">Add task</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
