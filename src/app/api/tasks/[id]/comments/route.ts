import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { addComment } from "@/lib/tasks";

export const POST = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  const { body } = z.object({ body: z.string().trim().min(1).max(2000) }).parse(await req.json());
  return NextResponse.json({ comment: await addComment(u, params.id, body) }, { status: 201 });
});
