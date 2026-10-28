import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

/**
 * File storage behind a tiny interface. The default driver writes to local disk (fine for one server /
 * development). For Vercel or multiple instances, implement the same three functions against an
 * S3-compatible bucket (@aws-sdk/client-s3 with PutObject/GetObject/DeleteObject) and return it here.
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
    const p = safe(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, data);
  },
  get: (key: string) => readFile(safe(key)),
  remove: (key: string) => unlink(safe(key)).catch(() => undefined),
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
