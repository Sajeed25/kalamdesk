"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function patch(id: string, body: object) {
  const r = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.ok ? null : ((await r.json()).error as string);
}

/** Review buttons for leads + comment box. */
export default function TaskActions({ id, canReview, inReview, selfInitiated, accepted }: { id: string; canReview: boolean; inReview: boolean; selfInitiated: boolean; accepted: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [comment, setComment] = useState("");
  const [stars, setStars] = useState(0);

  async function run(body: object) {
    setErr((await patch(id, body)) ?? "");
    router.refresh();
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    const r = await fetch(`/api/tasks/${id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: comment }) });
    if (r.ok) { setComment(""); router.refresh(); } else setErr((await r.json()).error);
  }

  return (
    <div className="space-y-4">
      {canReview && inReview && (
        <div className="panel flex flex-wrap items-center gap-2 p-3">
          <span className="text-sm font-medium">Review:</span>
          <label className="flex items-center gap-1 text-xs text-mute">Impact
            <select value={stars} onChange={(e) => setStars(Number(e.target.value))} className="input !w-auto !py-1 text-xs" aria-label="Founder impact rating">
              {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? "No rating" : "★".repeat(n)}</option>)}
            </select>
          </label>
          <button className="btn btn-primary" onClick={() => run({ review: "APPROVED", impactStars: stars })}>Approve</button>
          <button className="btn" onClick={() => { const n = window.prompt("What needs fixing?") ?? ""; run({ review: "SENT_BACK", reviewNote: n }); }}>Send back</button>
        </div>
      )}
      {canReview && selfInitiated && !accepted && (
        <button className="btn" onClick={() => run({ acceptInitiative: true })}>Accept self-initiated task (+ initiative points)</button>
      )}
      <form onSubmit={send} className="flex gap-2">
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment… use @name to mention" className="input" />
        <button className="btn">Send</button>
      </form>
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
