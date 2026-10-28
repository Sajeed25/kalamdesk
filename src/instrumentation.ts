/**
 * Runs once when the server starts. First-run bootstrap for hosts without a terminal:
 * if the database has NO users and BOOTSTRAP_FOUNDER_EMAIL / _NAME / _PASSWORD are set,
 * create that founder and the default departments. Once any user exists this does nothing,
 * so leaving the variables in place is harmless, but remove them after your first login.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
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
