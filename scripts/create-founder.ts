/**
 * Creates (or resets the password of) a founder account in whatever database DATABASE_URL points at.
 * Meant for the first login on a fresh production database. Does NOT create demo data.
 *
 *   npx tsx scripts/create-founder.ts --email you@yourdomain.com --name "Your Name" --password "a-long-password" [--org "Robokalam"]
 *
 * The founder becomes a group owner (can switch between organisations). --org names the home organisation,
 * which is created if it does not exist yet (default: the first organisation, or "Robokalam").
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

/** An existing account keeps its organisation unless it has none yet. */
const existingOrg = (u: { orgId: string | null } | null, fallback: string) => u?.orgId ?? fallback;

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const password = arg("password");
  if (!email || !name || !password) {
    console.error('Usage: npx tsx scripts/create-founder.ts --email you@domain.com --name "Your Name" --password "min 10 chars"');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Use a password of at least 10 characters.");
    process.exit(1);
  }

  const db = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const orgName = arg("org")?.trim();
    const org =
      (orgName ? await db.organization.findUnique({ where: { name: orgName } }) : await db.organization.findFirst({ orderBy: { createdAt: "asc" } })) ??
      (await db.organization.create({ data: { name: orgName || "Robokalam", slug: (orgName || "robokalam").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""), color: "#4f46e5" } }));
    const existing = await db.user.findUnique({ where: { email } });
    const user = existing
      ? await db.user.update({ where: { email }, data: { passwordHash, role: "FOUNDER", active: true, name, allOrgs: true, orgId: existingOrg(existing, org.id) } })
      : await db.user.create({ data: { email, name, passwordHash, role: "FOUNDER", allOrgs: true, orgId: org.id, profile: { create: { office: "Hyderabad", title: "Founder" } } } });
    if (existing && !(await db.employeeProfile.findUnique({ where: { userId: user.id } })))
      await db.employeeProfile.create({ data: { userId: user.id, office: "Hyderabad", title: "Founder" } });
    for (const d of ["Accounts", "BD", "Marketing", "Training", "Product", "HR", "Tech"])
      if (!(await db.department.findFirst({ where: { orgId: org.id, name: d } }))) await db.department.create({ data: { name: d, orgId: org.id } });
    await db.auditLog.create({ data: { actorId: user.id, orgId: org.id, action: existing ? "FOUNDER_RESET_VIA_CLI" : "FOUNDER_CREATED_VIA_CLI", target: user.id } });
    console.log(`${existing ? "Updated" : "Created"} founder ${email}. You can sign in now.`);
  } finally {
    await db.$disconnect();
  }
}

main();
