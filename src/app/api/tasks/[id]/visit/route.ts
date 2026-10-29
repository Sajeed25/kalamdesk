import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { loadContributableTask } from "@/lib/tasks";
import { notifyMany } from "@/lib/notify";

const OUTCOMES = ["GREAT", "GOOD", "NEEDS_FOLLOW_UP", "PROBLEM"] as const;

const KINDS = ["VISIT", "SESSION", "WORKSHOP"] as const;

const schema = z.object({
  kind: z.enum(KINDS).default("VISIT"),
  topics: z.string().trim().max(1000).optional().default(""),
  grade: z.string().trim().max(100).nullish(),
  teachers: z.number().int().min(0).max(100000).nullish(),
  summary: z.string().trim().min(5, "Tell us briefly how it went").max(2000),
  attendees: z.number().int().min(0).max(100000).nullish(), // students attended
  outcome: z.enum(OUTCOMES),
  followUp: z.string().trim().max(1000).optional().default(""),
});

// One report per visit task. The person doing the visit (or any lead) can write or update it.
export const POST = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  const task = await loadContributableTask(u, params.id);
  const b = schema.parse(await req.json());
  const data = { kind: b.kind, topics: b.topics, grade: b.grade || null, teachers: b.teachers ?? null, summary: b.summary, attendees: b.attendees ?? null, outcome: b.outcome, followUp: b.followUp };
  const existing = await db.visitReport.findUnique({ where: { taskId: task.id } });
  const report = await db.visitReport.upsert({ where: { taskId: task.id }, update: data, create: { ...data, taskId: task.id, userId: u.id } });
  await db.taskActivity.create({ data: { taskId: task.id, actorId: u.id, action: "EDITED", detail: existing ? "Updated the report" : "Filed the report" } });
  if (!existing && (b.outcome === "PROBLEM" || b.outcome === "NEEDS_FOLLOW_UP")) {
    const founders = await db.user.findMany({ where: { role: "FOUNDER", active: true }, select: { id: true } });
    await notifyMany(founders.map((f) => f.id), { kind: "STATUS", title: `${b.outcome === "PROBLEM" ? "Problem at" : "Follow-up needed after"} ${b.kind === "WORKSHOP" ? "workshop" : b.kind === "SESSION" ? "session" : "visit"}: ${task.title}`, body: `${u.name}: ${b.summary.slice(0, 160)}`, url: `/tasks/${task.id}`, email: b.outcome === "PROBLEM" }, u.id);
  }
  return NextResponse.json({ id: report.id }, { status: existing ? 200 : 201 });
});
