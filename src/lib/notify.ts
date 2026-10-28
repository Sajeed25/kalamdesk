import { db } from "./db";
import { sendEmail, emailTemplate, appUrl } from "./email";

/**
 * Notification service. Each delivery channel implements `Channel`; `notify()` fans out
 * to every channel enabled for the recipient. To add WhatsApp Business API / SMS later,
 * write one more Channel (see whatsappChannel stub) and add it to CHANNELS — no caller changes.
 */
export type NotifyInput = {
  userId: string;
  kind: string;
  title: string;
  body?: string;
  url?: string; // app-relative, e.g. /tasks/abc
  email?: boolean; // default true
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

// Phase 3 stub: wire to WhatsApp Business Cloud API using a pre-approved template.
const whatsappChannel: Channel = {
  name: "whatsapp",
  async send() {
    /* not enabled */
  },
};
void whatsappChannel;

const CHANNELS: Channel[] = [inAppChannel, emailChannel];

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
