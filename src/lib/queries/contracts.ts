import type { SupabaseClient } from "@supabase/supabase-js";
import type { Contract, Onboarding } from "@/types/database";

export type ContractWithRelations = Contract & {
  onboarding?: Pick<Onboarding, "id" | "status" | "sla_signed"> | null;
};

/**
 * Fetch the single contract for a lead with its phases and linked onboarding
 * status — one query via Supabase joins.
 */
export async function fetchContractByLead(
  supabase: SupabaseClient,
  leadId: string,
): Promise<ContractWithRelations | null> {
  const { data } = await supabase
    .from("contracts")
    .select("*, phases:contract_phases(*), onboarding:onboardings!onboarding_id(id,status,sla_signed)")
    .eq("lead_id", leadId)
    .maybeSingle<ContractWithRelations>();
  return data ?? null;
}

/** Fetch a contract by its public signing token (used by the /sign page server-side helpers). */
export async function fetchContractBySignToken(
  supabase: SupabaseClient,
  token: string,
): Promise<ContractWithRelations | null> {
  const { data } = await supabase
    .from("contracts")
    .select("*, phases:contract_phases(*), onboarding:onboardings!onboarding_id(id,status,sla_signed)")
    .eq("sign_token", token)
    .maybeSingle<ContractWithRelations>();
  return data ?? null;
}
