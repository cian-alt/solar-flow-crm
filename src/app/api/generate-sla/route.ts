import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSlaHtml } from "@/lib/slaHtml";
import type { Contract, ContractPhase } from "@/types/database";

export async function POST(request: Request) {
  let contractId: string | undefined;
  try {
    ({ contract_id: contractId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!contractId) return NextResponse.json({ error: "contract_id is required" }, { status: 400 });

  const supabase = await createClient();

  const { data: contract, error } = await supabase
    .from("contracts")
    .select("*, phases:contract_phases(*), lead:leads!lead_id(id, company_name, contact_name, email, phone, address, eircode)")
    .eq("id", contractId)
    .single<Contract & { lead: { company_name: string; contact_name: string | null; address: string | null; eircode: string | null } | null }>();

  if (error || !contract) {
    return NextResponse.json({ error: error?.message ?? "Contract not found" }, { status: 404 });
  }

  // Sequential reference: SF-YEAR-NNNN based on contract creation order.
  const { count } = await supabase.from("contracts").select("id", { count: "exact", head: true }).lte("created_at", contract.created_at);
  const year = (contract.start_date ?? contract.created_at).slice(0, 4);
  const reference = `SF-${year}-${String(count ?? 1).padStart(4, "0")}`;

  const phases = ((contract.phases ?? []) as ContractPhase[]).slice().sort((a, b) => a.start_date.localeCompare(b.start_date));

  const html = buildSlaHtml({
    contractId: contract.id,
    reference,
    company: contract.official_company_name ?? contract.lead?.company_name ?? "Client",
    clientAddress: contract.company_address ?? contract.lead?.address ?? "",
    clientEircode: contract.eircode ?? contract.lead?.eircode ?? "",
    clientVat: contract.vat_number ?? "",
    contactName: contract.lead?.contact_name ?? "",
    subscriptionPackage: contract.subscription_package,
    monthlyAmount: contract.monthly_amount ?? 0,
    durationMonths: contract.contract_duration_months ?? 12,
    startDate: contract.start_date,
    paymentType: contract.payment_type,
    phases: phases.map((p) => ({ monthly_price: p.monthly_price, start_date: p.start_date, end_date: p.end_date })),
    onboardingPackage: contract.onboarding_package,
    onboardingFee: contract.onboarding_fee ?? 0,
    specialConditions: contract.special_conditions,
  });

  const updates: Record<string, unknown> = { sla_html: html, sla_status: "draft", updated_at: new Date().toISOString() };
  if (!contract.sign_token) updates.sign_token = crypto.randomUUID();

  const { error: upErr } = await supabase.from("contracts").update(updates).eq("id", contractId);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, reference });
}
