import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { dbRaw } from "./db";

/**
 * File storage behind a tiny interface.
 *  - Files are kept in the DATABASE (table FileBlob). That way they survive redeploys on shared hosting
 *    (where the app folder is replaced every time) and are included in your database backups.
 *  - If the table does not exist yet, or a file is too big for the database connection, it falls back to local disk
 *    (UPLOAD_DIR). Reads check the database first and then the disk, so files saved before this change still open.
 * To use an S3-compatible bucket instead, implement the same three functions here.
 */
const root = () => path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

// Keys are generated server-side (never from user input) but we still refuse path tricks.
const safe = (key: string) => {
  const p = path.resolve(root(), key);
  if (!p.startsWith(root() + path.sep)) throw new Error("Bad storage key");
  return p;
};

export const storage = {
  async put(key: string, data: Buffer) {
    try {
      await dbRaw.fileBlob.upsert({ where: { key }, update: { data, size: data.length }, create: { key, data, size: data.length } });
      return;
    } catch {
      /* table missing or file too large for the connection: use the disk */
    }
    const p = safe(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, data);
  },
  async get(key: string): Promise<Buffer> {
    try {
      const row = await dbRaw.fileBlob.findUnique({ where: { key } });
      if (row) return Buffer.from(row.data);
    } catch {
      /* fall through to the disk */
    }
    return readFile(safe(key));
  },
  async remove(key: string) {
    await dbRaw.fileBlob.deleteMany({ where: { key } }).catch(() => undefined);
    await unlink(safe(key)).catch(() => undefined);
  },
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Images, PDFs, Office docs, text/CSV. Everything else is refused. SVG is deliberately excluded (script risk). */
export const ALLOWED_MIME = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
]);
