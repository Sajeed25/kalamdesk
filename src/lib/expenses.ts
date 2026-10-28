import { z } from "zod";
import { dateKeySchema } from "./dates";

export const CATEGORIES = ["TRAVEL", "FUEL", "FOOD", "STATIONERY", "OTHER"] as const;
export const CATEGORY_LABEL: Record<string, string> = { TRAVEL: "Travel", FUEL: "Fuel", FOOD: "Food", STATIONERY: "Stationery", OTHER: "Other" };
export const EXPENSE_STATUS_LABEL: Record<string, string> = { SUBMITTED: "Waiting", APPROVED: "Approved", REJECTED: "Rejected", PAID: "Paid" };

export const MAX_RECEIPT = 5 * 1024 * 1024;
export const RECEIPT_MIME = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

export const expenseSchema = z.object({
  title: z.string().trim().min(2, "Say what it was for").max(200),
  category: z.enum(CATEGORIES),
  amountInr: z.coerce.number().int("Whole rupees only").min(1, "Enter the amount").max(1_000_000),
  spentOn: dateKeySchema,
  notes: z.string().trim().max(1000).optional().default(""),
});

export const decisionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "PAID"]),
  note: z.string().trim().max(300).optional().default(""),
});

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** CSV cell safe against spreadsheet formula injection. */
export const csvCell = (v: string | number) => {
  const s = String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
