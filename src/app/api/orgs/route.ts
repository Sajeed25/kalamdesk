import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { authed } from "@/lib/api";
import { dbRaw } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { orgSchema, requireOwner, slugify } from "@/lib/orgs";
import { sendPasswordLink } from "@/lib/reset";
import { runInOrg } from "@/lib/tenancy";
import { HttpError } from "@/lib/tasks";

// Start a new organisation (e.g. Calvings). Optionally invite its first founder, who will only ever see that organisation.
export const POST = authed(async (req, u) => {
  requireOwner(u);
  const b = orgSchema.extend({
    founderName: z.string().trim().max(100).optional().default(""),
    founderEmail: z.string().trim().toLowerCase().email().or(z.literal("")).optional().default(""),
  }).parse(await req.json());
  if (await dbRaw.organization.findUnique({ where: { name: b.name } })) throw new HttpError(409, "An organisation with that name already exists");
  let slug = slugify(b.name);
  if (await dbRaw.organization.findUnique({ where: { slug } })) slug = `${slug}-${randomBytes(2).toString("hex")}`;
  if (b.founderEmail && !b.founderName) throw new HttpError(400, "Enter the founder's name too");
  if (b.founderEmail && (await dbRaw.user.findUnique({ where: { email: b.founderEmail } }))) throw new HttpError(409, "That email already has an account");

  const org = await dbRaw.organization.create({ data: { name: b.name, slug, tagline: b.tagline, color: b.color } });
  let founderId: string | null = null;
  await runInOrg(org.id, async () => {
    const { db } = await import("@/lib/db");
    if (b.founderEmail) {
      const f = await db.user.create({
        data: {
          email: b.founderEmail, name: b.founderName, role: "FOUNDER",
          passwordHash: await hashPassword(randomBytes(24).toString("hex")), // they set their own from the invite link
          profile: { create: { office: "Hyderabad", title: "Founder" } },
        },
      });
      founderId = f.id;
      await sendPasswordLink(f.id, "invite");
    }
    await db.auditLog.create({ data: { actorId: u.id, action: "ORG_CREATED", target: org.id, meta: org.name } });
  });
  return NextResponse.json({ id: org.id, founderId }, { status: 201 });
});
