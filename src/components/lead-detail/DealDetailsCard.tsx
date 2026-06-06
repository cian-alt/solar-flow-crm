'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pencil, FileText, Rocket, ExternalLink } from "lucide-react";
import type { Contract, Onboarding } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { monthsBetween } from "@/lib/contractRevenue";
import { formatDate, formatEuro, cn } from "@/lib/utils";

interface Props {
  leadId: string;
  onEditDeal: () => void;
}

export default function DealDetailsCard({ leadId, onEditDeal }: Props) {
  const supabase = createClient();
  const [contract, setContract] = useState<Contract | null>(null);
  const [onboarding, setOnboarding] = useState<Pick<Onboarding, "id" | "status" | "sla_signed"> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("contracts").select("*, phases:contract_phases(*)").eq("lead_id", leadId).maybeSingle<Contract>();
      setContract(c ?? null);
      if (c?.onboarding_id) {
        const { data: o } = await supabase.from("onboardings").select("id, status, sla_signed").eq("id", c.onboarding_id).maybeSingle();
        setOnboarding(o ?? null);
      }
      setLoading(false);
    })();
  }, [leadId, supabase]);

  if (loading) return <div className="skeleton h-40 rounded-2xl" />;

  // No contract yet — prompt to run the close-deal flow.
  if (!contract) {
    return (
      <div className="glass-card p-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#0F172A]">Deal not configured yet</h3>
          <p className="text-xs text-slate-500 mt-0.5">Capture the package, contract and SLA for this client.</p>
        </div>
        <button onClick={onEditDeal} className="px-4 py-2 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors shrink-0">Close Deal</button>
      </div>
    );
  }

  const subTotal = (contract.phases ?? []).reduce((s, p) => s + (p.monthly_price ?? 0) * monthsBetween(p.start_date, p.end_date), 0);
  const total = subTotal + (contract.onboarding_fee ?? 0);
  const slaStatus = onboarding?.sla_signed ? "Signed" : contract.sla_status === "sent" ? "Sent" : "Draft";
  const slaColor = slaStatus === "Signed" ? "text-emerald-600 bg-emerald-50" : slaStatus === "Sent" ? "text-blue-600 bg-blue-50" : "text-slate-500 bg-slate-100";
  const onbStatusLabel = onboarding ? ({ not_started: "Not Started", in_progress: "In Progress", completed: "Completed", on_hold: "On Hold" }[onboarding.status]) : "—";

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[#0F172A]">Deal Details</h3>
        {contract.is_draft && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">Draft</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Cell label="Package" value={contract.subscription_package ?? "—"} sub={contract.monthly_amount ? `${formatEuro(contract.monthly_amount)}/mo` : ""} />
        <Cell label="Onboarding" value={contract.onboarding_package ?? "—"} sub={formatEuro(contract.onboarding_fee ?? 0)} />
        <Cell label="Contract Value" value={formatEuro(total)} sub={`${contract.contract_duration_months ?? "—"} mo`} />
        <Cell label="Contract Start" value={contract.start_date ? formatDate(contract.start_date) : "—"} />
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">SLA Status</p>
          <span className={cn("inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full", slaColor)}>{slaStatus}</span>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Onboarding</p>
          <p className="text-sm font-semibold text-[#0F172A] mt-1">{onbStatusLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/60">
        <button onClick={onEditDeal} className="flex items-center gap-1.5 px-3 py-2 bg-[#1B3A6B] text-white text-xs font-semibold rounded-xl hover:bg-[#152E55] transition-colors mt-3">
          <Pencil size={13} /> Edit Deal
        </button>
        {contract.sla_document_url && (
          <a href={contract.sla_document_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors mt-3">
            <FileText size={13} /> View SLA <ExternalLink size={11} />
          </a>
        )}
        {contract.onboarding_id && (
          <Link href={`/onboarding/${contract.onboarding_id}`} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors mt-3">
            <Rocket size={13} /> View Onboarding
          </Link>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-[#0F172A] mt-1">{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
