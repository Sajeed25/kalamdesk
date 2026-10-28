import { z } from "zod";

export const FIELDS = ["accountHolder", "accountNumber", "ifsc", "bankName", "upiId", "idNumber"] as const;
export type Field = (typeof FIELDS)[number];

const blank = (s: unknown) => (typeof s === "string" && s.trim() === "" ? undefined : s);

const ID_PATTERNS: Record<string, RegExp> = {
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  AADHAAR: /^[0-9]{12}$/,
  PASSPORT: /^[A-Z][0-9]{7}$/,
  OTHER: /^[A-Z0-9]{4,30}$/,
};

/** Every field is optional: an empty value means "leave unchanged". Use `clear` to remove a field. */
export const bankSchema = z
  .object({
    accountHolder: z.preprocess(blank, z.string().trim().min(2).max(100).optional()),
    accountNumber: z.preprocess((v) => blank(typeof v === "string" ? v.replace(/\s+/g, "") : v), z.string().regex(/^[0-9]{6,20}$/, "Account number must be 6 to 20 digits").optional()),
    ifsc: z.preprocess((v) => blank(typeof v === "string" ? v.trim().toUpperCase() : v), z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "IFSC looks like HDFC0001234").optional()),
    bankName: z.preprocess(blank, z.string().trim().min(2).max(100).optional()),
    upiId: z.preprocess((v) => blank(typeof v === "string" ? v.trim() : v), z.string().regex(/^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,32}$/, "UPI ID looks like name@bank").optional()),
    idType: z.enum(["PAN", "AADHAAR", "PASSPORT", "OTHER"]).optional(),
    idNumber: z.preprocess((v) => blank(typeof v === "string" ? v.replace(/\s+/g, "").toUpperCase() : v), z.string().optional()),
    clear: z.array(z.enum(FIELDS)).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.idNumber) {
      const type = v.idType ?? "OTHER";
      if (!ID_PATTERNS[type].test(v.idNumber)) ctx.addIssue({ code: "custom", path: ["idNumber"], message: `That does not look like a valid ${type} number` });
    }
  });
