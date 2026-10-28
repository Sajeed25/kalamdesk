import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import { appUrl, emailTemplate, sendEmail } from "./email";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Create a single-use link and email it. Used for both "forgot password" and new-user invites. */
export async function sendPasswordLink(userId: string, kind: "reset" | "invite") {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) return;
  const token = randomBytes(32).toString("hex");
  const hours = kind === "invite" ? 72 : 1;
  await db.passwordReset.create({ data: { userId, tokenHash: sha(token), expiresAt: new Date(Date.now() + hours * 3600 * 1000) } });
  const heading = kind === "invite" ? "Welcome to KalamDesk" : "Reset your password";
  const line = kind === "invite" ? "Your account is ready. Set a password to get started." : "Use the button below to choose a new password. The link works once and expires in 1 hour.";
  await sendEmail(user.email, heading, emailTemplate({ heading, lines: [line], ctaLabel: "Set password", ctaUrl: appUrl(`/reset/${token}`) }));
}

export async function consumeToken(token: string, newPasswordHash: string) {
  const row = await db.passwordReset.findUnique({ where: { tokenHash: sha(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return false;
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: newPasswordHash } }),
    db.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.auditLog.create({ data: { actorId: row.userId, action: "PASSWORD_RESET", target: row.userId } }),
  ]);
  return true;
}

export async function tokenValid(token: string) {
  const row = await db.passwordReset.findUnique({ where: { tokenHash: sha(token) } });
  return !!row && !row.usedAt && row.expiresAt > new Date();
}
