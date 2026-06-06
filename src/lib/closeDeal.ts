import { format, startOfMonth } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Lead,
  Contract,
  Onboarding,
  OnboardingPackage,
  RecommendedPackage,
  PaymentType,
} from "@/types/database";
import { createOnboarding, notify } from "./onboarding";
import { monthsBetween } from "./contractRevenue";
import { generateSlaPdf } from "./sla";
import { uploadDocument } from "./storage";

export interface DealPhase {
  monthly_price: number;
  start_date: string;
  end_date: string;
}

export interface CloseDealInput {
  lead: Lead;
  subscriptionPackage: RecommendedPackage;
  monthlyAmount: number;
  subscriptionDiscount: boolean;
  subscriptionOriginalAmount: number | null;
  subscriptionDiscountReason: string | null;
  contractDurationMonths: number;
  startDate: string; // yyyy-MM-dd
  paymentType: PaymentType;
  phases: DealPhase[];
  onboardingPackage: OnboardingPackage;
  onboardingFee: number;
  onboardingDiscount: boolean;
  onboardingOriginalFee: number | null;
  onboardingDiscountReason: string | null;
  client: {
    officialCompanyName: string;
    address: string;
    eircode: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    vatNumber: string;
  };
  generateSla: boolean; // false = save as draft
}

export interface CloseDealResult {
  contract?: Contract;
  onboarding?: Onboarding;
  totalContractValue: number;
  error?: string;
}

const DEFAULT_ONBOARDING_RATE = 40;
const DEFAULT_RETENTION_RATE = 5;

export function dealTotals(input: Pick<CloseDealInput, "phases" | "onboardingFee">) {
  const subscriptionTotal = input.phases.reduce(
    (sum, p) => sum + (Number(p.monthly_price) || 0) * monthsBetween(p.start_date, p.end_date),
    0,
  );
  return { subscriptionTotal, total: subscriptionTotal + (input.onboardingFee || 0) };
}

export async function closeDeal(supabase: SupabaseClient, input: CloseDealInput): Promise<CloseDealResult> {
  const { lead } = input;
  const { total } = dealTotals(input);

  // ── 1. Upsert contract ───────────────────────────────────────────────────────
  const contractFields = {
    lead_id: lead.id,
    onboarding_fee: input.onboardingFee,
    payment_type: input.paymentType,
    subscription_package: input.subscriptionPackage,
    monthly_amount: input.monthlyAmount,
    contract_duration_months: input.contractDurationMonths,
    start_date: input.startDate,
    subscription_discount: input.subscriptionDiscount,
    subscription_original_amount: input.subscriptionOriginalAmount,
    subscription_discount_reason: input.subscriptionDiscountReason,
    onboarding_package: input.onboardingPackage,
    onboarding_discount: input.onboardingDiscount,
    onboarding_original_fee: input.onboardingOriginalFee,
    onboarding_discount_reason: input.onboardingDiscountReason,
    official_company_name: input.client.officialCompanyName,
    company_address: input.client.address,
    eircode: input.client.eircode,
    vat_number: input.client.vatNumber || null,
    is_draft: !input.generateSla,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase.from("contracts").select("id").eq("lead_id", lead.id).maybeSingle();
  let contractId: string;
  if (existing) {
    contractId = existing.id;
    const { error } = await supabase.from("contracts").update(contractFields).eq("id", contractId);
    if (error) return { error: error.message, totalContractValue: total };
  } else {
    const { data, error } = await supabase.from("contracts").insert(contractFields).select("id").single();
    if (error || !data) return { error: error?.message ?? "Failed to save contract", totalContractValue: total };
    contractId = data.id;
  }

  // Phases (delete + re-insert)
  await supabase.from("contract_phases").delete().eq("contract_id", contractId);
  const validPhases = input.phases.filter((p) => p.monthly_price && p.start_date && p.end_date);
  if (validPhases.length > 0) {
    await supabase.from("contract_phases").insert(
      validPhases.map((p) => ({ contract_id: contractId, monthly_price: p.monthly_price, start_date: p.start_date, end_date: p.end_date })),
    );
  }

  // Draft: stop here.
  if (!input.generateSla) {
    const { data: contract } = await supabase.from("contracts").select("*, phases:contract_phases(*)").eq("id", contractId).single<Contract>();
    return { contract: contract ?? undefined, totalContractValue: total };
  }

  // ── 2. Create onboarding ──────────────────────────────────────────────────────
  const onbRes = await createOnboarding(supabase, {
    leadId: lead.id,
    companyName: input.client.officialCompanyName || lead.company_name,
    contactName: input.client.contactName,
    email: input.client.contactEmail,
    phone: input.client.contactPhone,
    pkg: input.onboardingPackage,
    assignedAm: lead.assigned_to,
    startDate: input.startDate ? new Date(input.startDate) : new Date(),
  });
  const onboarding = onbRes.onboarding;
  if (onboarding) {
    await supabase.from("contracts").update({ onboarding_id: onboarding.id }).eq("id", contractId);
  }

  // ── 3. Generate SLA PDF, upload, attach ───────────────────────────────────────
  let slaUrl: string | null = null;
  if (onboarding) {
    try {
      const blob = generateSlaPdf({
        client: {
          companyName: input.client.officialCompanyName || lead.company_name,
          address: input.client.address,
          eircode: input.client.eircode,
          contactName: input.client.contactName,
          contactEmail: input.client.contactEmail,
          contactPhone: input.client.contactPhone,
          vatNumber: input.client.vatNumber,
        },
        subscriptionPackage: input.subscriptionPackage,
        monthlyAmount: input.monthlyAmount,
        contractDurationMonths: input.contractDurationMonths,
        startDate: input.startDate,
        paymentType: input.paymentType,
        phases: validPhases,
        onboardingPackage: input.onboardingPackage,
        onboardingFee: input.onboardingFee,
        totalContractValue: total,
      });
      const path = `sla/${onboarding.id}/${Date.now()}-SLA.pdf`;
      const up = await uploadDocument(supabase, blob, path, "application/pdf");
      if (up.url) {
        slaUrl = up.url;
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("onboarding_documents").insert({
          onboarding_id: onboarding.id, document_type: "sla", title: "Service Level Agreement.pdf",
          file_url: slaUrl, uploaded_by: user?.id ?? null, visible_to_client: true,
        });
      }
    } catch {
      // PDF generation/upload failure shouldn't abort the close — surfaced below via missing URL.
    }
  }

  await supabase.from("contracts").update({ sla_status: "sent", sla_document_url: slaUrl, is_draft: false }).eq("id", contractId);

  // ── 4. Commission records (skip if already created for this contract) ──────────
  if (lead.assigned_to) {
    const { data: existingComm } = await supabase.from("commission_records").select("id").eq("contract_id", contractId).limit(1);
    if (!existingComm || existingComm.length === 0) {
      const { data: ep } = await supabase.from("employee_profiles").select("onboarding_commission_rate, retention_commission_rate").eq("id", lead.assigned_to).maybeSingle();
      const onbRate = ep?.onboarding_commission_rate ?? DEFAULT_ONBOARDING_RATE;
      const retRate = ep?.retention_commission_rate ?? DEFAULT_RETENTION_RATE;
      const monthYear = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const onboardingCommission = Math.round(input.onboardingFee * (onbRate / 100) * 100) / 100;
      const retentionCommission = Math.round(input.monthlyAmount * (retRate / 100) * 100) / 100;
      await supabase.from("commission_records").insert([
        { employee_id: lead.assigned_to, lead_id: lead.id, contract_id: contractId, commission_type: "onboarding", amount: onboardingCommission, month_year: monthYear, is_paid: false, notes: "Auto-created on deal close" },
        { employee_id: lead.assigned_to, lead_id: lead.id, contract_id: contractId, commission_type: "retention", amount: retentionCommission, month_year: monthYear, is_paid: false, notes: "First month retention" },
      ]);
    }
  }

  // ── 5. Notifications ──────────────────────────────────────────────────────────
  const company = input.client.officialCompanyName || lead.company_name;
  const { data: { user } } = await supabase.auth.getUser();
  const amName = user?.user_metadata?.full_name ?? "An account manager";
  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
  for (const admin of (admins ?? []) as { id: string }[]) {
    if (admin.id === lead.assigned_to) continue;
    await notify(supabase, { user_id: admin.id, type: "onboarding_created", title: "Deal closed 🎉", message: `${amName} just closed ${company} on ${input.subscriptionPackage} — €${input.monthlyAmount.toLocaleString("en-IE")}/month!`, lead_id: lead.id });
  }
  if (lead.assigned_to) {
    const onbComm = Math.round(input.onboardingFee * (DEFAULT_ONBOARDING_RATE / 100));
    const retComm = Math.round(input.monthlyAmount * (DEFAULT_RETENTION_RATE / 100));
    await notify(supabase, { user_id: lead.assigned_to, type: "commission_paid", title: "Deal closed!", message: `Your commission: €${onbComm} onboarding + €${retComm}/month retention`, lead_id: lead.id });
  }

  const { data: contract } = await supabase.from("contracts").select("*, phases:contract_phases(*)").eq("id", contractId).single<Contract>();
  return { contract: contract ?? undefined, onboarding, totalContractValue: total };
}
