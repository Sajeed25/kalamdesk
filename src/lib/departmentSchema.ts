import { z } from "zod";

export const departmentFields = {
  name: z.string().trim().min(1, "Name is required").max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colour must look like #22c55e"),
};
