import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Setup check for a fresh deployment. Public, so it only reports yes/no flags:
 * no values, counts, paths or error text that could help an attacker.
 */
/** Coarse category only. The raw message may contain paths or hostnames, so it stays in the server log. */
function classify(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("must start with the protocol") || m.includes("provider") || m.includes("invalid database string"))
    return "DATABASE_URL does not match the schema provider (this build expects a SQLite 'file:' URL)";
  if (m.includes("query engine") || m.includes("binary") || m.includes("libssl") || m.includes("prisma client could not locate"))
    return "Prisma engine for this server's OS is missing: run 'npx prisma generate' on the server";
  if (m.includes("unable to open") || m.includes("cannot open") || m.includes("eacces") || m.includes("read-only") || m.includes("readonly"))
    return "SQLite file cannot be opened or written (folder missing or not writable)";
  if (m.includes("no such table") || m.includes("does not exist"))
    return "tables are missing: run 'npx prisma db push'";
  if (m.includes("econnrefused") || m.includes("can't reach") || m.includes("timed out"))
    return "database server unreachable";
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
  };
  try {
    await db.$queryRaw`SELECT 1`;
    out.dbReachable = true;
    out.hasUsers = (await db.user.count()) > 0;
    out.schemaReady = true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[health]", msg);
    out.dbProblem = classify(msg);
  }
  const ok = out.sessionSecretOk && out.dbReachable && out.schemaReady && out.hasUsers;
  return NextResponse.json({ ok, ...out }, { status: ok ? 200 : 503 });
}
