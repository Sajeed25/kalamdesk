import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLead } from "@/lib/rbac";

export default async function Home() {
  const u = await requireUser();
  redirect(isLead(u) ? "/desk" : "/my-day"); // role-based default view
}
