import { NextResponse } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api";
import { db } from "@/lib/db";
import { isFounder } from "@/lib/rbac";
import { sendPasswordLink } from "@/lib/reset";
import { assertDepartment, assertPeople } from "@/lib/orgGuard";
import { HttpError } from "@/lib/tasks";
import { toDate, userFields } from "@/lib/userSchema";


export const PATCH = authed<{ params: { id: string } }>(async (req, u, { params }) => {
  if (!isFounder(u)) throw new HttpError(403, "Only founders can edit people");
  const body = z.object({ ...userFields, active: z.boolean(), resendInvite: z.boolean() }).partial().parse(await req.json());
  const target = await db.user.findUnique({ where: { id: params.id } });
  if (!target) throw new HttpError(404, "Not found");
  if (target.orgId !== u.orgId) throw new HttpError(403, "Group owners are managed by the owners themselves");
  await assertDepartment(body.departmentId);
  await assertPeople([body.managerId], "manager");

  if (body.resendInvite) {
    await sendPasswordLink(target.id, "invite");
    return NextResponse.json({ ok: true });
  }

  // Never lock the company out: keep at least one active founder.
  const losesFounder = target.role === "FOUNDER" && ((body.role && body.role !== "FOUNDER") || body.active === false);
  if (losesFounder && (await db.user.count({ where: { role: "FOUNDER", active: true } })) <= 1)
    throw new HttpError(400, "There must be at least one active founder");
  if (body.managerId && body.managerId === params.id) throw new HttpError(400, "A person can't report to themselves");

  await db.user.update({
    where: { id: params.id },
    data: {
      name: body.name, role: body.role, active: body.active,
      departmentId: body.departmentId === undefined ? undefined : body.departmentId || null,
      profile: {
        update: {
          office: body.office, title: body.title, phone: body.phone,
          personalEmail: body.personalEmail === undefined ? undefined : body.personalEmail || null,
          emergencyContact: body.emergencyContact, employmentType: body.employmentType,
          managerId: body.managerId === undefined ? undefined : body.managerId || null,
          joinedOn: body.joinedOn === undefined ? undefined : toDate(body.joinedOn),
          internStart: body.internStart === undefined ? undefined : toDate(body.internStart),
          internEnd: body.internEnd === undefined ? undefined : toDate(body.internEnd),
        },
      },
    },
  });
  await db.auditLog.create({ data: { actorId: u.id, action: body.active === false ? "USER_DEACTIVATED" : "USER_UPDATED", target: params.id, meta: Object.keys(body).join(",") } });
  return NextResponse.json({ ok: true });
});
