import { db } from "./db";
import { sendEmail, emailTemplate, appUrl } from "./email";
import { normalizePhone, sendWhatsapp, whatsappConfigured } from "./whatsapp";
import { taskCode } from "./whatsappInbound";
import { sendPush } from "./push";

/**
 * Notification service. Each delivery channel implements `Channel`; `notify()` fans out
 * to every channel enabled for the recipient. A new channel (SMS, push) is one more Channel in CHANNELS,
 * with no change to any caller.
 */
export type NotifyInput = {
  userId: string;
  kind: string;
  title: string;
  body?: string;
  url?: string; // app-relative, e.g. /tasks/abc
  email?: boolean; // default true
  push?: boolean; // default true: also shown on the lock screen of any phone the person has allowed it on
};

type Recipient = { id: string; email: string; name: string };

interface Channel {
  name: string;
  send(to: Recipient, n: NotifyInput): Promise<void>;
}

const inAppChannel: Channel = {
  name: "in-app",
  async send(to, n) {
    await db.notification.create({
      data: { userId: to.id, kind: n.kind, title: n.title, body: n.body ?? "", url: n.url ?? "" },
    });
  },
};

const emailChannel: Channel = {
  name: "email",
  async send(to, n) {
    if (n.email === false) return;
    const html = emailTemplate({
      heading: n.title,
      lines: n.body ? [n.body] : [],
      ctaLabel: "Open in KalamDesk",
      ctaUrl: n.url ? appUrl(n.url) : undefined,
    });
    await sendEmail(to.email, n.title, html);
  },
};

// Only these kinds are worth a WhatsApp message; comments, status chatter and digests stay in-app/email.
const WHATSAPP_KINDS = new Set(["ASSIGNED", "BLOCKED", "SENT_BACK", "REMINDER", "APPROVED"]);

const whatsappChannel: Channel = {
  name: "whatsapp",
  async send(to, n) {
    if (!whatsappConfigured() || !WHATSAPP_KINDS.has(n.kind)) return;
    // Look up consent + number only when WhatsApp is configured, and fail safe: if the column is missing
    // (schema not upgraded yet) this must never affect in-app or email delivery.
    let profile: { phone: string | null; whatsappOptIn: boolean } | null = null;
    try {
      profile = await db.employeeProfile.findUnique({ where: { userId: to.id }, select: { phone: true, whatsappOptIn: true } });
    } catch {
      return;
    }
    const phone = normalizePhone(profile?.phone);
    if (!profile?.whatsappOptIn || !phone) return; // explicit opt-in required
    // Tell them how to answer straight from WhatsApp (see /api/inbound/whatsapp).
    const id = /^\/tasks\/([a-z0-9]+)/i.exec(n.url ?? "")?.[1];
    const body = id ? `${(n.body ?? "").slice(0, 130)} Reply DONE ${taskCode(id)} when finished.` : n.body ?? "";
    await sendWhatsapp(phone, n.title, body, n.url ? appUrl(n.url) : appUrl("/"));
  },
};

// Lock-screen alert. Only people who switched notifications on (a stored device subscription) ever receive one.
// Digests are skipped: they are long, scheduled, and already arrive by email.
const pushChannel: Channel = {
  name: "push",
  async send(to, n) {
    if (n.push === false || n.kind === "DIGEST") return;
    await sendPush(to.id, { title: n.title, body: n.body, url: n.url, tag: `${n.kind}:${n.url ?? n.title}` });
  },
};

const CHANNELS: Channel[] = [inAppChannel, emailChannel, whatsappChannel, pushChannel];

export async function notify(n: NotifyInput) {
  const user = await db.user.findUnique({ where: { id: n.userId }, select: { id: true, email: true, name: true, active: true } });
  if (!user || !user.active) return;
  // One channel failing must never block the user action that triggered it.
  await Promise.allSettled(CHANNELS.map((c) => c.send(user, n)));
}

export async function notifyMany(ids: string[], n: Omit<NotifyInput, "userId">, exceptId?: string) {
  const unique = Array.from(new Set(ids)).filter((i) => i !== exceptId);
  await Promise.all(unique.map((userId) => notify({ ...n, userId })));
}
