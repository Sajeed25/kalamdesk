import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendPasswordLink } from "@/lib/reset";

// Always answers the same way so the form can't be used to discover which emails have accounts.
export async function POST(req: Request) {
  const body = z.object({ email: z.string().email() }).safeParse(await req.json().catch(() => null));
  if (body.success) {
    const user = await db.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
    if (user) await sendPasswordLink(user.id, "reset");
  }
  return NextResponse.json({ ok: true });
}
