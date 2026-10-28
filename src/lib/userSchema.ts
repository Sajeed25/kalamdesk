import { z } from "zod";
import { OFFICES, ROLES } from "./constants";

export const userFields = {
  name: z.string().trim().min(1).max(100),
  role: z.enum(ROLES),
  departmentId: z.string().nullish(),
  office: z.enum(OFFICES as [string, ...string[]]),
  title: z.string().trim().max(100).nullish(),
  phone: z.string().trim().max(30).nullish(),
  personalEmail: z.string().trim().email().or(z.literal("")).nullish(),
  emergencyContact: z.string().trim().max(200).nullish(),
  employmentType: z.enum(["FULL_TIME", "INTERN", "CONTRACT"]),
  managerId: z.string().nullish(),
  joinedOn: z.string().nullish(),
  internStart: z.string().nullish(),
  internEnd: z.string().nullish(),
};

export const toDate = (s?: string | null) => (s ? new Date(s) : null);
