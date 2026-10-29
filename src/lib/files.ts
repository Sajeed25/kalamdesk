import { HttpError } from "./httpError";

/** Types a browser may show inline. Everything else is always downloaded. */
export const INLINE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]);
export const isImage = (mime: string) => mime.startsWith("image/");

const startsWith = (b: Buffer, bytes: number[], at = 0) => bytes.every((x, i) => b[at + i] === x);

/** Does the file's real content match the type the browser claimed? Stops an HTML or script file posing as a photo. */
export function contentMatches(declared: string, b: Buffer): boolean {
  switch (declared) {
    case "image/jpeg": return startsWith(b, [0xff, 0xd8, 0xff]);
    case "image/png": return startsWith(b, [0x89, 0x50, 0x4e, 0x47]);
    case "image/gif": return startsWith(b, [0x47, 0x49, 0x46, 0x38]);
    case "image/webp": return startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8);
    case "application/pdf": return startsWith(b, [0x25, 0x50, 0x44, 0x46]);
    default: return true; // Office / text files are always downloaded, never rendered
  }
}

export function assertRealFile(declared: string, b: Buffer) {
  if (!contentMatches(declared, b)) throw new HttpError(415, "That file is not a real " + (declared === "application/pdf" ? "PDF" : "photo") + ". Please pick the original file.");
}

/**
 * Response for opening a stored file. Photos and PDFs open in the browser (so people can simply look at them);
 * everything else, or ?download=1, downloads. Always nosniff, never cached, and inline images get a locked-down policy.
 */
export function fileResponse(data: Buffer, name: string, mime: string, download: boolean) {
  const inline = !download && INLINE_MIME.has(mime);
  const headers: Record<string, string> = {
    "Content-Type": inline ? mime : mime || "application/octet-stream",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  };
  if (inline && isImage(mime)) headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";
  return new Response(new Uint8Array(data), { headers });
}
