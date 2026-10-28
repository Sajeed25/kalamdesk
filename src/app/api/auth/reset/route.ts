import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { consumeToken } from "@/lib/reset";

const passwordRule = z.string().min(8, "Use at least 8 characters").max(100);

export async function POST(req: Request) {
  const body = z.object({ token: z.string().min(20), password: passwordRule }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const ok = await consumeToken(body.data.token, await hashPassword(body.data.password));
  if (!ok) return NextResponse.json({ error: "This link is invalid or has expired. Request a new one." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
