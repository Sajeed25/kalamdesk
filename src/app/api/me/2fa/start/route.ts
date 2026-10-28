import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/tasks";
import { cryptoConfigured } from "@/lib/crypto";
import { newSecret, otpauthUrl } from "@/lib/totp";
import { setSetup } from "@/lib/twofa";

// Step 1 of turning 2FA on. Nothing is saved yet: the new secret travels in a short-lived signed cookie
// until the person proves their app works by entering a code (see /enable).
export const POST = authed(async (_req, u) => {
  if (!cryptoConfigured()) throw new HttpError(503, "Encryption is not set up on the server (FIELD_ENCRYPTION_KEY), so 2FA cannot be stored safely yet.");
  const row = await db.user.findUnique({ where: { id: u.id }, select: { totpSecret: true } });
  if (row?.totpSecret) throw new HttpError(409, "Two-step sign-in is already on");
  const secret = newSecret();
  await setSetup(u.id, secret);
  const url = otpauthUrl(u.email, "KalamDesk", secret);
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 240 });
  return NextResponse.json({ secret: secret.match(/.{1,4}/g)!.join(" "), otpauth: url, qr }, { headers: { "Cache-Control": "no-store" } });
});
