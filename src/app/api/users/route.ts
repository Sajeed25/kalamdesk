import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { isFounder } from "@/lib/rbac";
import { sendPasswordLink } from "@/lib/reset";
import { HttpError } from "@/lib/tasks";
import { toDate, userFields } from "@/lib/userSchema";

export const GET = authed(async (_req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Founders only");
  const users = await db.user.findMany({ include: { profile: true, department: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ users: users.map(({ passwordHash: _p, totpSecret: _t, ...rest }) => rest) });
});

export const POST = authed(async (req, u) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can add people");
  const input = z.object({ ...userFields, email: z.string().trim().toLowerCase().email() }).parse(await req.json());
  if (await db.user.findUnique({ where: { email: input.email } })) throw new HttpError(409, "That email already has an account");

  const user = await db.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      departmentId: input.departmentId || null,
      // random placeholder: the person sets their own password from the invite link
      passwordHash: await hashPassword(randomBytes(24).toString("hex")),
      profile: {
        create: {
          office: input.office, title: input.title ?? null, phone: input.phone ?? null,
          personalEmail: input.personalEmail || null, emergencyContact: input.emergencyContact ?? null,
          employmentType: input.employmentType, managerId: input.managerId || null,
          joinedOn: toDate(input.joinedOn), internStart: toDate(input.internStart), internEnd: toDate(input.internEnd),
        },
      },
    },
  });
  await db.auditLog.create({ data: { actorId: u.id, action: "USER_CREATED", target: user.id, meta: `${user.email} as ${user.role}` } });
  await sendPasswordLink(user.id, "invite");
  return NextResponse.json({ id: user.id }, { status: 201 });
});
