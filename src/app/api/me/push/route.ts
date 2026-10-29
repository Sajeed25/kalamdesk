import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { dbRaw } from "@/lib/db";
import { endpointHash, getVapid, subscriptionSchema } from "@/lib/push";

// Lock-screen notifications for the signed-in person. Subscriptions belong to a person, not an organisation.

/** Is push available, what is the public key, and is this person subscribed on any device? */
export const GET = authed(async (_req, u) => {
  try {
    const vapid = await getVapid();
    const devices = await dbRaw.pushSubscription.count({ where: { userId: u.id } });
    return NextResponse.json({ configured: !!vapid, publicKey: vapid?.publicKey ?? null, devices });
  } catch {
    return NextResponse.json({ configured: false, publicKey: null, devices: 0, needsUpgrade: true });
  }
});

/** Register this phone / browser. Safe to call again: the same device is simply refreshed. */
export const POST = authed(async (req, u) => {
  const sub = subscriptionSchema.parse(await req.json());
  const hash = endpointHash(sub.endpoint);
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 250);
  await dbRaw.pushSubscription.upsert({
    where: { endpointHash: hash },
    update: { userId: u.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: ua },
    create: { userId: u.id, endpointHash: hash, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: ua },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
});

/** Turn it off for this device (or for all devices if no endpoint is given). */
export const DELETE = authed(async (req, u) => {
  const b = z.object({ endpoint: z.string().max(2000).optional() }).parse(await req.json().catch(() => ({})));
  if (b.endpoint) await dbRaw.pushSubscription.deleteMany({ where: { userId: u.id, endpointHash: endpointHash(b.endpoint) } });
  else await dbRaw.pushSubscription.deleteMany({ where: { userId: u.id } });
  return NextResponse.json({ ok: true });
});
