import { PrismaClient } from "@prisma/client";
import { DIRECT_MODELS, currentOrgId, readScope, writeScope } from "./tenancy";

const g = globalThis as unknown as { prismaRaw?: PrismaClient };

/** Unfiltered client. Only for sign-in, a person's own account, the group owner's overview and server jobs. */
export const dbRaw = g.prismaRaw ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prismaRaw = dbRaw;

const READS = new Set(["findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy"]);
const UNIQUE_READS = new Set(["findUnique", "findUniqueOrThrow"]);
const MANY_WRITES = new Set(["updateMany", "deleteMany"]);
const UNIQUE_WRITES = new Set(["update", "delete"]);

/** The everyday client: every query is limited to the signed-in organisation (see tenancy.ts). */
export const db = dbRaw.$extends({
  name: "organisation-isolation",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const orgId = await currentOrgId();
        if (!orgId) return query(args);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const a = args as any;
        const read = readScope(model, orgId);
        const write = writeScope(model, orgId);
        if (READS.has(operation) && read) a.where = a.where ? { AND: [a.where, read] } : read;
        else if (UNIQUE_READS.has(operation) && read) a.where = { ...a.where, ...read };
        else if (MANY_WRITES.has(operation) && write) a.where = a.where ? { AND: [a.where, write] } : write;
        else if (UNIQUE_WRITES.has(operation) && write) a.where = { ...a.where, ...write };
        else if (operation === "upsert" && write) {
          a.where = { ...a.where, ...write };
          if (DIRECT_MODELS.has(model)) a.create = { ...a.create, orgId };
        } else if (operation === "create" && DIRECT_MODELS.has(model)) a.data = { ...a.data, orgId };
        else if (operation === "createMany" && DIRECT_MODELS.has(model))
          a.data = Array.isArray(a.data) ? a.data.map((d: object) => ({ ...d, orgId })) : { ...a.data, orgId };
        return query(a);
      },
    },
  },
});
