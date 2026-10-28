import { z } from "zod";

export const STAGES = ["NEW", "CONTACTED", "DEMO", "PROPOSAL", "WON", "LOST"] as const;
export const STAGE_LABEL: Record<string, string> = { NEW: "New", CONTACTED: "Contacted", DEMO: "Demo", PROPOSAL: "Proposal", WON: "Won", LOST: "Lost" };
export const OUTCOMES = ["CONNECTED", "NO_ANSWER", "CALL_BACK", "NOT_INTERESTED", "WRONG_NUMBER"] as const;
export const OUTCOME_LABEL: Record<string, string> = { CONNECTED: "Spoke to them", NO_ANSWER: "No answer", CALL_BACK: "Call back later", NOT_INTERESTED: "Not interested", WRONG_NUMBER: "Wrong number" };

const opt = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(150),
  organisation: opt(150),
  phone: opt(30),
  email: z.string().trim().max(150).nullish().transform((v) => v || null).refine((v) => v === null || /^\S+@\S+\.\S+$/.test(v), "Enter a valid email"),
  source: opt(100),
  valueInr: z.number().int().min(0).max(1_000_000_000).nullish().transform((v) => v ?? null),
  nextFollowUp: z.string().datetime().nullish().transform((v) => (v ? new Date(v) : null)),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const leadPatchSchema = z.object({
  stage: z.enum(STAGES).optional(),
  nextFollowUp: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
  valueInr: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  ownerId: z.string().min(1).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  organisation: z.string().trim().max(150).nullable().optional(),
});

export const callSchema = z.object({
  outcome: z.enum(OUTCOMES),
  note: z.string().trim().max(500).optional().default(""),
  nextFollowUp: z.string().datetime().nullish(),
});
