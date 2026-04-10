import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import TeamPageClient from "@/components/team/TeamPageClient";

export default async function TeamPage() {
  const supabase = await createClient();
  const [{ data: profiles }, { data: leads }] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("leads").select("id,assigned_to,stage,deal_value"),
  ]);

  const profilesWithStats = ((profiles as Profile[]) ?? []).map(p => {
    const assigned = (leads ?? []).filter(l => l.assigned_to === p.id);
    const closedWon = assigned.filter(l => l.stage === "Closed Won");
    return {
      ...p,
      assigned_count: assigned.length,
      closed_won_count: closedWon.length,
      revenue: closedWon.reduce((s: number, l: { deal_value?: number }) => s + (l.deal_value ?? 0), 0),
    };
  });

  return <TeamPageClient profiles={profilesWithStats} />;
}
