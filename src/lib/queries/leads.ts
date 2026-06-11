import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead } from "@/types/database";

const LEAD_SELECT =
  "*, assigned_profile:profiles!assigned_to(id,full_name,avatar_initials,email,role_title), researched_profile:profiles!researched_by(id,full_name,avatar_initials)";

/** Fetch a single lead with its assigned + researcher profiles in one query. */
export async function fetchLead(supabase: SupabaseClient, id: string): Promise<Lead | null> {
  const { data } = await supabase.from("leads").select(LEAD_SELECT).eq("id", id).maybeSingle<Lead>();
  return data ?? null;
}

/** Fetch all leads (list views) with the assigned AM joined. */
export async function fetchLeads(supabase: SupabaseClient): Promise<Lead[]> {
  const { data } = await supabase
    .from("leads")
    .select("*, assigned_profile:profiles!assigned_to(id,full_name,avatar_initials,email)")
    .order("created_at", { ascending: false });
  return (data as Lead[]) ?? [];
}
