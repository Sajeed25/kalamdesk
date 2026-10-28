import { db } from "./db";
import { HttpError } from "./httpError";

/**
 * Ids that arrive from the browser (department, manager, assignees ...) are looked up through the organisation-filtered
 * client, so an id belonging to another organisation simply is not found.
 */
export async function assertDepartment(id: string | null | undefined) {
  if (id && !(await db.department.count({ where: { id } }))) throw new HttpError(400, "Unknown department");
}

export async function assertPeople(ids: (string | null | undefined)[], label = "person") {
  const want = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (want.length && (await db.user.count({ where: { id: { in: want } } })) !== want.length) throw new HttpError(400, `Unknown ${label}`);
}
