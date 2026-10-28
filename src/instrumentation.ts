/**
 * Runs once when the server starts. First-run bootstrap for hosts without a terminal:
 * if the database has NO users and BOOTSTRAP_FOUNDER_EMAIL / _NAME / _PASSWORD are set,
 * create that founder and the default departments. Once any user exists this does nothing,
 * so leaving the variables in place is harmless, but remove them after your first login.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  await emergencyTwoFactorReset();
  const email = process.env.BOOTSTRAP_FOUNDER_EMAIL?.trim().toLowerCase();
  const name = process.env.BOOTSTRAP_FOUNDER_NAME?.trim();
  const password = process.env.BOOTSTRAP_FOUNDER_PASSWORD;
  if (!email || !name || !password) return;

  try {
    const { db } = await import("./lib/db");
    if ((await db.user.count()) > 0) return;
    if (password.length < 10) {
      console.error("[bootstrap] BOOTSTRAP_FOUNDER_PASSWORD must be at least 10 characters; no account created.");
      return;
    }
    const { hashPassword } = await import("./lib/auth");
    const user = await db.user.create({
      data: {
        email, name, role: "FOUNDER", passwordHash: await hashPassword(password),
        profile: { create: { office: "Hyderabad", title: "Founder" } },
      },
    });
    for (const d of ["Accounts", "BD", "Marketing", "Training", "Product", "HR", "Tech"])
      await db.department.upsert({ where: { name: d }, update: {}, create: { name: d } });
    await db.auditLog.create({ data: { actorId: user.id, action: "FOUNDER_BOOTSTRAPPED", target: user.id } });
    console.log(`[bootstrap] Created first founder ${email}. Remove the BOOTSTRAP_FOUNDER_* variables now.`);
  } catch (e) {
    // Most likely the tables don't exist yet. Never stop the app from starting.
    console.error("[bootstrap] skipped:", e instanceof Error ? e.message : e);
  }
}

/**
 * Lock-out recovery for the person who controls the server: list email addresses in RESET_2FA_EMAILS
 * (comma separated), restart, and their two-step sign-in is switched off (and the audit log says so).
 * Remove the variable afterwards. Needs access to the server settings, so an attacker on the website cannot use it.
 */
async function emergencyTwoFactorReset() {
  const raw = process.env.RESET_2FA_EMAILS;
  if (!raw) return;
  try {
    const { db } = await import("./lib/db");
    const emails = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    for (const email of emails) {
      const u = await db.user.findUnique({ where: { email } });
      if (!u?.totpSecret) continue;
      await db.user.update({ where: { id: u.id }, data: { totpSecret: null } });
      await db.recoveryCode.deleteMany({ where: { userId: u.id } });
      await db.auditLog.create({ data: { actorId: u.id, action: "TWOFA_RESET_VIA_SERVER", target: u.id } });
      console.log(`[2fa] Two-step sign-in switched off for ${email} via RESET_2FA_EMAILS. Remove that variable now.`);
    }
  } catch (e) {
    console.error("[2fa] emergency reset skipped:", e instanceof Error ? e.message : e);
  }
}
