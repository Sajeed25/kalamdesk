import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isFounder } from "@/lib/rbac";
import { DEFAULTS, getSettings } from "@/lib/scoring";
import ScoringForm from "@/components/ScoringForm";

export const dynamic = "force-dynamic";

export default async function ScoringSettings() {
  const u = await requireUser();
  if (!isFounder(u)) redirect("/leaderboard");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/leaderboard" className="text-sm text-mute hover:underline">← Scores</Link>
      <h1 className="text-2xl font-bold">Scoring settings</h1>
      <p className="text-sm text-mute">Every weight the score uses is editable here. Changes apply to tasks completed from now on; points already earned keep the explanation they were scored with.</p>
      <ScoringForm values={await getSettings()} defaults={DEFAULTS} />
    </div>
  );
}
