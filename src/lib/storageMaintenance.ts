import { dbRaw } from "./db";
import { storage } from "./storage";
import { notify } from "./notify";

/**
 * Keeps the database under a size limit (default 2 GB, DB_LIMIT_MB) so it stays fast on shared hosting.
 *
 *  - At 80% of the limit the group owners are warned (once a month).
 *  - At 90% a group owner is ASKED to approve a clean-up (banner, bell, email, weekly). Nothing is deleted until they click Approve,
 *    and they can first see exactly what would go.
 *  - Optional standing approval ("Auto-rotate"): the group owner can let KalamDesk make room by itself at 90%, always removing the
 *    OLDEST data first, so new uploads effectively replace the oldest ones.
 *  - A clean-up removes the oldest, least valuable data, gentlest first, until usage is back under 80%:
 *      1. Junk: read notifications, expired password links, old job markers, orphaned files.
 *      2. Old attachments (photos, PDFs) of tasks that finished long ago. Oldest first, never younger than 30 days.
 *      3. Very old stand-ups, task history and audit entries.
 *  - NEVER removed automatically: people, tasks, scores, incentives, leave, leads, expense claims and their receipts,
 *    ID documents, bank details, anything on a task that is still open.
 *  Set STORAGE_AUTOCLEAN=off to switch Auto-rotate off for good (warnings and the approval button stay).
 */
const MB = 1024 * 1024;
export const limitBytes = () => (Number(process.env.DB_LIMIT_MB) > 0 ? Number(process.env.DB_LIMIT_MB) : 2048) * MB;
export const WARN_AT = 0.8;
export const ASK_AT = 0.9;
export const TARGET = 0.8;
const day = 864e5;
const ago = (days: number) => new Date(Date.now() - days * day);
const isMysql = () => (process.env.DATABASE_URL ?? "").startsWith("mysql");

/** Current size of the whole database (data + indexes), or null if the host will not tell us. */
export async function dbSizeBytes(): Promise<number | null> {
  try {
    if (isMysql()) {
      const r = await dbRaw.$queryRawUnsafe<{ b: bigint | number | string | null }[]>("SELECT COALESCE(SUM(data_length + index_length), 0) AS b FROM information_schema.tables WHERE table_schema = DATABASE()");
      return Number(r[0]?.b ?? 0);
    }
    const pc = await dbRaw.$queryRawUnsafe<{ page_count: bigint | number }[]>("PRAGMA page_count");
    const ps = await dbRaw.$queryRawUnsafe<{ page_size: bigint | number }[]>("PRAGMA page_size");
    return Number(pc[0].page_count) * Number(ps[0].page_size);
  } catch {
    return null;
  }
}

/** The biggest tables, so people can see what is using the space. */
export async function biggestTables(limit = 6): Promise<{ name: string; bytes: number }[]> {
  if (!isMysql()) return [];
  try {
    const r = await dbRaw.$queryRawUnsafe<{ t: string; b: bigint | number | string }[]>(
      `SELECT table_name AS t, (data_length + index_length) AS b FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY b DESC LIMIT ${Math.min(limit, 20)}`
    );
    return r.map((x) => ({ name: x.t, bytes: Number(x.b) }));
  } catch {
    return [];
  }
}

export type Step = { id: string; label: string; rows: number; bytes: number };
export type CleanupResult = { mode: "junk" | "auto"; dry: boolean; before: number | null; after: number | null; steps: Step[]; stillOver: boolean };

// ---------------- tier 1: junk ----------------
async function tier1(dry: boolean): Promise<Step[]> {
  const steps: Step[] = [];
  const del = async (id: string, label: string, count: () => Promise<number>, remove: () => Promise<unknown>) => {
    const rows = await count();
    if (rows && !dry) await remove();
    steps.push({ id, label, rows, bytes: rows * 400 });
  };
  const readOld = { OR: [{ readAt: { not: null }, createdAt: { lt: ago(30) } }, { createdAt: { lt: ago(120) } }] };
  await del("notifications", "Old notifications (read for 30+ days, or older than 120 days)", () => dbRaw.notification.count({ where: readOld }), () => dbRaw.notification.deleteMany({ where: readOld }));
  const stale = { expiresAt: { lt: ago(7) } };
  await del("resets", "Expired password and invite links", () => dbRaw.passwordReset.count({ where: stale }), () => dbRaw.passwordReset.deleteMany({ where: stale }));
  // Reminder markers (remind-*) are kept: deleting one would re-send that reminder. storage-* hold the Auto-rotate setting.
  const markers = { createdAt: { lt: ago(60) }, NOT: [{ kind: { startsWith: "remind-" } }, { kind: { startsWith: "storage-" } }] };
  await del("jobs", "Old scheduler markers", () => dbRaw.jobRun.count({ where: markers }), () => dbRaw.jobRun.deleteMany({ where: markers }));

  // Files nobody refers to any more (e.g. an upload that failed half way).
  let orphanRows = 0, orphanBytes = 0;
  const [att, rec, doc] = await Promise.all([
    dbRaw.taskAttachment.findMany({ select: { storageKey: true } }),
    dbRaw.expenseClaim.findMany({ where: { receiptKey: { not: null } }, select: { receiptKey: true } }),
    dbRaw.idDocument.findMany({ select: { storageKey: true } }),
  ]);
  const used = new Set<string>([...att.map((a) => a.storageKey), ...rec.map((r) => r.receiptKey as string), ...doc.map((d) => d.storageKey)]);
  const blobs = await dbRaw.fileBlob.findMany({ where: { createdAt: { lt: ago(1) } }, select: { key: true, size: true } });
  for (const b of blobs) {
    if (used.has(b.key)) continue;
    orphanRows++; orphanBytes += b.size;
    if (!dry) await dbRaw.fileBlob.delete({ where: { key: b.key } }).catch(() => undefined);
  }
  steps.push({ id: "orphans", label: "Files that no task, receipt or document uses", rows: orphanRows, bytes: orphanBytes });
  return steps;
}

// ---------------- tier 2: old attachments of finished tasks ----------------
async function oldAttachments(days: number, budget: number, dry: boolean): Promise<Step> {
  const cutoff = ago(days);
  const where = { task: { status: { in: ["DONE", "CANCELLED"] }, OR: [{ completedAt: { lt: cutoff } }, { completedAt: null, updatedAt: { lt: cutoff } }] } };
  let rows = 0, bytes = 0;
  const touched = new Map<string, { creatorId: string; n: number }>();
  const seen = new Set<string>();
  while (bytes < budget) {
    const batch = await dbRaw.taskAttachment.findMany({ where, orderBy: [{ createdAt: "asc" }], take: 100, include: { task: { select: { id: true, creatorId: true } } } });
    const fresh = batch.filter((a) => !seen.has(a.id));
    if (!fresh.length) break;
    for (const a of fresh) {
      if (bytes >= budget) break;
      seen.add(a.id);
      rows++; bytes += a.sizeBytes;
      const t = touched.get(a.taskId) ?? { creatorId: a.task.creatorId, n: 0 };
      t.n++; touched.set(a.taskId, t);
      if (!dry) {
        await storage.remove(a.storageKey);
        await dbRaw.taskAttachment.delete({ where: { id: a.id } });
      }
    }
    if (dry) break; // a dry run only needs a sample of the oldest files, not the whole history
  }
  if (!dry) for (const [taskId, t] of touched) await dbRaw.taskActivity.create({ data: { taskId, actorId: t.creatorId, action: "EDITED", detail: `${t.n} old attachment${t.n > 1 ? "s were" : " was"} removed automatically to free up storage` } });
  return { id: `attachments-${days}`, label: `Attachments on tasks finished over ${days} days ago (oldest first)`, rows, bytes };
}

// ---------------- tier 3: very old records ----------------
async function oldRecords(dry: boolean): Promise<Step[]> {
  const steps: Step[] = [];
  const upd = { createdAt: { lt: ago(400) } };
  const n1 = await dbRaw.dailyUpdate.count({ where: upd });
  if (n1 && !dry) await dbRaw.dailyUpdate.deleteMany({ where: upd });
  steps.push({ id: "standups", label: "Daily updates older than 400 days", rows: n1, bytes: n1 * 700 });
  const act = { createdAt: { lt: ago(400) }, task: { status: { in: ["DONE", "CANCELLED"] } } };
  const n2 = await dbRaw.taskActivity.count({ where: act });
  if (n2 && !dry) await dbRaw.taskActivity.deleteMany({ where: act });
  steps.push({ id: "activity", label: "Task history of finished tasks older than 400 days", rows: n2, bytes: n2 * 300 });
  const aud = { createdAt: { lt: ago(730) } };
  const n3 = await dbRaw.auditLog.count({ where: aud });
  if (n3 && !dry) await dbRaw.auditLog.deleteMany({ where: aud });
  steps.push({ id: "audit", label: "Audit log entries older than 2 years", rows: n3, bytes: n3 * 300 });
  return steps;
}

/** Give the space back to the host: deleting rows alone does not shrink the files the host measures. */
async function reclaim(tables: string[]) {
  try {
    if (isMysql()) for (const t of tables) await dbRaw.$queryRawUnsafe(`OPTIMIZE TABLE \`${t.replace(/[^A-Za-z0-9_]/g, "")}\``);
    else await dbRaw.$executeRawUnsafe("VACUUM");
  } catch { /* the host may not allow it; the space is still reused by new data */ }
}

/**
 * mode "junk": only tier 1 (always safe, any time). mode "auto": tier 1, then tiers 2 and 3 until usage is under 85% of the limit.
 * dry = true only counts what would be removed.
 */
export async function cleanup(mode: "junk" | "auto", dry = false): Promise<CleanupResult> {
  const before = await dbSizeBytes();
  const steps: Step[] = [];
  steps.push(...(await tier1(dry)));
  if (mode === "auto") {
    const target = limitBytes() * TARGET;
    // On a dry run (or when the size is unknown) plan against a fixed amount of work: whatever brings the size to the target.
    let need = before === null ? 0 : Math.max(0, before - target) - steps.reduce((s, x) => s + x.bytes, 0);
    for (const days of [365, 180, 90, 30]) {
      if (need <= 0) break;
      const s = await oldAttachments(days, need, dry);
      if (s.rows) steps.push(s);
      need -= s.bytes;
    }
    if (need > 0) {
      const t3 = await oldRecords(dry);
      steps.push(...t3);
      need -= t3.reduce((s, x) => s + x.bytes, 0);
    }
  }
  const removed = steps.some((s) => s.rows > 0);
  if (!dry && removed) await reclaim(["FileBlob", "TaskAttachment", "Notification", "JobRun", "AuditLog", "TaskActivity", "DailyUpdate"]);
  const after = dry ? before : await dbSizeBytes();
  return { mode, dry, before, after, steps, stillOver: mode === "auto" && !dry && after !== null && after >= limitBytes() };
}

const mb = (b: number | null) => (b === null ? "unknown" : `${(b / MB).toFixed(b > 100 * MB ? 0 : 1)} MB`);
export const fmtSize = mb;

async function tell(title: string, body: string) {
  const owners = await dbRaw.user.findMany({ where: { allOrgs: true, active: true }, select: { id: true } });
  for (const o of owners) await notify({ userId: o.id, kind: "REMINDER", title, body, url: "/organisations", email: true });
}

// ---------------- Auto-rotate: a standing approval from a group owner ----------------
const AUTO_KIND = "storage-auto";
export async function autoRotateOn(): Promise<boolean> {
  if (process.env.STORAGE_AUTOCLEAN === "off") return false;
  try { return (await dbRaw.jobRun.count({ where: { kind: AUTO_KIND, key: "on" } })) > 0; } catch { return false; }
}
export async function setAutoRotate(on: boolean) {
  if (on) await dbRaw.jobRun.create({ data: { kind: AUTO_KIND, key: "on" } }).catch(() => undefined);
  else await dbRaw.jobRun.deleteMany({ where: { kind: AUTO_KIND } });
  invalidateState();
}

/** Record who approved a clean-up, run it, and tell the other group owners. */
export async function runApproved(actor: { id: string; name: string; orgId?: string | null } | null, how: "approved" | "auto-rotate") {
  const res = await cleanup("auto");
  const removed = res.steps.reduce((s, x) => s + x.rows, 0);
  await dbRaw.auditLog.create({ data: { actorId: actor?.id ?? null, orgId: actor?.orgId ?? null, action: "STORAGE_CLEANUP", target: "database", meta: `${how}: ${mb(res.before)} -> ${mb(res.after)}; ${res.steps.filter((s) => s.rows).map((s) => `${s.rows} ${s.id}`).join(", ")}`.slice(0, 480) } });
  await tell(
    res.stillOver ? "Storage is still full after clean-up" : "Old data was cleaned up to free storage",
    `${actor ? `${actor.name} approved a clean-up.` : "Auto-rotate made room."} ${removed} old item${removed === 1 ? "" : "s"} removed; the database went from ${mb(res.before)} to ${mb(res.after)} (limit ${mb(limitBytes())}).${res.stillOver ? " It is still over the limit: export what you need and ask your host about more space." : ""}`
  );
  invalidateState();
  return res;
}

// ---------------- state for the screen and the banner (cached for a few minutes) ----------------
export type StorageState = { sizeBytes: number | null; limitBytes: number; pct: number | null; level: "ok" | "warn" | "approve"; autoRotate: boolean };
let memo: { at: number; v: StorageState } | null = null;
const invalidateState = () => { memo = null; };
export async function storageState(fresh = false): Promise<StorageState> {
  if (!fresh && memo && Date.now() - memo.at < 10 * 60 * 1000) return memo.v;
  const sizeBytes = await dbSizeBytes();
  const limit = limitBytes();
  const pct = sizeBytes === null ? null : sizeBytes / limit;
  const v: StorageState = { sizeBytes, limitBytes: limit, pct, level: pct !== null && pct >= ASK_AT ? "approve" : pct !== null && pct >= WARN_AT ? "warn" : "ok", autoRotate: await autoRotateOn() };
  memo = { at: Date.now(), v };
  return v;
}

/** Called once a day by the scheduler. Warns at 80%; at 90% either asks for approval, or (if Auto-rotate is on) makes room by itself. */
export async function maintain(): Promise<{ action: string; before?: number | null; after?: number | null; steps?: Step[] }> {
  const size = await dbSizeBytes();
  if (size === null) return { action: "size unavailable" };
  const limit = limitBytes();
  const month = new Date().toISOString().slice(0, 7);
  const week = `${new Date().getUTCFullYear()}-W${Math.floor(Date.now() / (7 * day))}`;

  if (size >= limit * ASK_AT) {
    if (await autoRotateOn()) {
      const res = await runApproved(null, "auto-rotate");
      return { action: "auto-rotated", before: res.before, after: res.after, steps: res.steps };
    }
    try {
      await dbRaw.jobRun.create({ data: { kind: "storage-ask", key: week } });
      await tell("Approval needed: storage is almost full", `The database is at ${mb(size)} of ${mb(limit)}. Nothing will be deleted unless you approve. Open Organisations → Storage to see exactly which old attachments and records would be removed, then approve or leave it.`);
      return { action: "approval requested", before: size };
    } catch { return { action: "approval already requested this week", before: size }; }
  }
  if (size >= limit * WARN_AT) {
    try {
      await dbRaw.jobRun.create({ data: { kind: "storage-warn", key: month } });
      await tell("Storage is getting full", `The database is at ${mb(size)} of ${mb(limit)}. At 90% you will be asked to approve a clean-up of the oldest data. Nothing is deleted without your approval unless Auto-rotate is on.`);
      return { action: "warned", before: size };
    } catch { /* already warned this month */ }
  }
  return { action: "ok", before: size };
}
