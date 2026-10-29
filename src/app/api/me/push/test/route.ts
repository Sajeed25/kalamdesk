import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { sendPush } from "@/lib/push";
import { HttpError } from "@/lib/httpError";

// "Send me a test": confirms the whole chain works on this phone.
export const POST = authed(async (_req, u) => {
  const sent = await sendPush(u.id, { title: "KalamDesk test", body: "Lock-screen notifications are working. 🎉", url: "/my-day", tag: "kd-test" });
  if (!sent) throw new HttpError(409, "No device received it. Turn notifications on for this phone first.");
  return NextResponse.json({ ok: true, sent });
});
