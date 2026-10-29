import { createHash } from "crypto";
import webpush from "web-push";
import { z } from "zod";
import { dbRaw } from "./db";
import { cryptoConfigured, decryptField, encryptField } from "./crypto";
import { appUrl } from "./email";

/**
 * Lock-screen notifications (Web Push). A phone that has allowed notifications registers a "subscription";
 * we send it a small message, the phone's own push service (Google / Apple / Microsoft / Mozilla) delivers it,
 * and KalamDesk's service worker shows it. The server needs a key pair (VAPID); it is generated once and kept in the
 * database (private half encrypted), or taken from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY if you set them.
 */

// Browsers only ever hand out endpoints on their vendor's push service. We refuse anything else, so a crafted
// subscription can never make this server call an arbitrary address.
const PUSH_HOSTS = /^(?:[a-z0-9-]+\.)*(?:googleapis\.com|push\.apple\.com|notify\.windows\.com|push\.services\.mozilla\.com|mozilla\.com)$/i;
export const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000).refine((u) => {
    try { const x = new URL(u); return x.protocol === "https:" && PUSH_HOSTS.test(x.hostname); } catch { return false; }
  }, "Unrecognised push service"),
  keys: z.object({ p256dh: z.string().min(20).max(255), auth: z.string().min(8).max(255) }),
});

export const endpointHash = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");

type Vapid = { publicKey: string; privateKey: string };
let cached: Vapid | null = null;

/** The server's key pair, or null if push cannot be set up (e.g. no encryption key to protect the private half). */
export async function getVapid(): Promise<Vapid | null> {
  if (cached) return cached;
  const envPub = process.env.VAPID_PUBLIC_KEY?.trim(), envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPub && envPriv) return (cached = { publicKey: envPub, privateKey: envPriv });
  if (!cryptoConfigured()) return null;
  const read = async () => {
    const row = await dbRaw.pushConfig.findUnique({ where: { id: "default" } });
    return row ? { publicKey: row.publicKey, privateKey: decryptField(row.privateKeyEnc, "push:vapid") } : null;
  };
  let v = await read();
  if (!v) {
    const k = webpush.generateVAPIDKeys();
    try {
      await dbRaw.pushConfig.create({ data: { id: "default", publicKey: k.publicKey, privateKeyEnc: encryptField(k.privateKey, "push:vapid") } });
    } catch { /* another instance created it first */ }
    v = await read();
  }
  return (cached = v);
}

function subject() {
  const base = appUrl("/");
  return base.startsWith("https://") ? base : "mailto:noreply@kalamdesk.app";
}

export type PushPayload = { title: string; body?: string; url?: string; tag?: string };

/** Send to every device a person has registered. Dead subscriptions (uninstalled / permission removed) are cleaned up. Never throws. */
export async function sendPush(userId: string, p: PushPayload): Promise<number> {
  try {
    const subs = await dbRaw.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return 0;
    const vapid = await getVapid();
    if (!vapid) return 0;
    const payload = JSON.stringify({ title: p.title.slice(0, 120), body: (p.body ?? "").slice(0, 160), url: p.url || "/my-day", tag: p.tag });
    let sent = 0;
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          vapidDetails: { subject: subject(), publicKey: vapid.publicKey, privateKey: vapid.privateKey }, TTL: 60 * 60 * 24, urgency: "normal",
        });
        sent++;
        await dbRaw.pushSubscription.update({ where: { id: s.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await dbRaw.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      }
    }));
    return sent;
  } catch {
    return 0; // tables not created yet, or any other problem: never block the action that triggered the alert
  }
}
