import { z } from "zod";
import { PRIORITIES } from "./constants";

export const templateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  priority: z.enum(PRIORITIES).default("P3"),
  complexity: z.number().int().min(1).max(5).default(2),
  estimateHours: z.number().min(0).max(1000).nullish(),
  departmentId: z.string().nullish(),
  checklist: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
});

/** Checklist is stored one step per line (the table column is a single text field). */
export const joinChecklist = (items: string[]) => items.join("\n").slice(0, 2000);
export const splitChecklist = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
