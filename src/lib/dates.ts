import { z } from "zod";

/** A real calendar date as YYYY-MM-DD (rejects 2026-02-31). Client-safe: no database import. */
export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date").refine((s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}, "Not a real date");
