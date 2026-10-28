import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cryptoConfigured } from "@/lib/crypto";
import { whatsappConfigured } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const startedAt = new Date().toISOString();

/**
 * Yes/no facts about the shape of DATABASE_URL: never the user, host, database name or password.
 * Helps spot stray quotes/spaces, an unencoded password, or a missing Hostinger prefix.
 */
function inspectDatabaseUrl() {
  const raw = process.env.DATABASE_URL ?? "";
  const info: Record<string, unknown> = {
    hasQuotesOrSpaces: raw !== raw.trim() || /^["']|["']$/.test(raw),
    startsWithMysql: /^mysql:\/\//i.test(raw.trim()),
  };
  const body = raw.trim().replace(/^["']|["']$/g, "").replace(/^mysql:\/\//i, "");
  const at = body.lastIndexOf("@");
  if (at > -1) {
    const cred = body.slice(0, at);
    const rest = body.slice(at + 1);
    const user = cred.split(":")[0];
    const pass = cred.includes(":") ? cred.slice(cred.indexOf(":") + 1) : "";
    const [hostPort, db = ""] = rest.split("/");
    const [host, port = ""] = hostPort.split(":");
    info.passwordNeedsEncoding = /[@#/?:]/.test(pass) || /%(?![0-9a-fA-F]{2})/.test(pass);
    info.userLooksPrefixed = /^u\d+_/.test(user);
    info.databaseLooksPrefixed = /^u\d+_/.test(db.split("?")[0]);
    info.hostKind = host === "localhost" || host === "127.0.0.1" ? "localhost" : host.endsWith(".hstgr.io") ? "hostinger-remote" : "other";
    info.port = port || "(default 3306)";
    info.hasDatabaseName = db.split("?")[0].length > 0;
  } else {
    info.parsable = false;
  }
  return info;
}

/**
 * Setup check for a fresh deployment. Public, so it only reports yes/no flags:
 * no values, counts, paths or error text that could help an attacker.
 */
/** Coarse category only. The raw message may contain paths or hostnames, so it stays in the server log. */
function classify(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("must start with the protocol") || m.includes("invalid database string") || m.includes("provider"))
    return "DATABASE_URL is not a mysql:// URL (format: mysql://USER:PASSWORD@HOST:3306/DBNAME)";
  if (m.includes("query engine") || m.includes("binary") || m.includes("libssl") || m.includes("prisma client could not locate"))
    return "Prisma engine for this server's OS is missing: run 'npx prisma generate' on the server";
  if (m.includes("authentication failed") || m.includes("access denied"))
    return "MySQL rejected the username or password (special characters in the password must be URL-encoded)";
  if (m.includes("unknown database") || m.includes("does not exist") && m.includes("database"))
    return "MySQL database name in DATABASE_URL does not exist";
  if (m.includes("no such table") || m.includes("doesn't exist") || m.includes("does not exist"))
    return "tables are missing: run 'npx prisma db push'";
  if (m.includes("econnrefused") || m.includes("can't reach") || m.includes("timed out") || m.includes("enotfound"))
    return "MySQL server unreachable (check the host in DATABASE_URL; on Hostinger it is usually localhost)";
  return "other: check the server log for lines starting with [health]";
}

export async function GET() {
  const out = {
    sessionSecretOk: (process.env.SESSION_SECRET?.length ?? 0) >= 32,
    databaseUrlSet: !!process.env.DATABASE_URL,
    dbReachable: false,
    schemaReady: false,
    hasUsers: false,
    dbProblem: null as string | null,
    phase3Schema: null as boolean | null,
    encryptionKeyOk: cryptoConfigured(),
    whatsappConfigured: whatsappConfigured(),
    serverStartedAt: startedAt,
    databaseUrlCheck: inspectDatabaseUrl(),
  };
  try {
    await db.$queryRaw`SELECT 1`;
    out.dbReachable = true;
    out.hasUsers = (await db.user.count()) > 0;
    out.schemaReady = true;
    // Phase 3 added columns. If this fails, run prisma/phase3-upgrade.sql before using the new features.
    try { await db.incentiveRule.count(); await db.employeeProfile.findFirst({ select: { whatsappOptIn: true } }); out.phase3Schema = true; } catch { out.phase3Schema = false; }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[health]", msg);
    out.dbProblem = classify(msg);
  }
  // phase3Schema === false means the upgrade SQL was not run: the app is broken until it is.
  const ok = out.sessionSecretOk && out.dbReachable && out.schemaReady && out.hasUsers && out.phase3Schema !== false;
  return NextResponse.json({ ok, ...out }, { status: ok ? 200 : 503 });
}
