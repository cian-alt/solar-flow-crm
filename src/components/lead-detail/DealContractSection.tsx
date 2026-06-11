'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileSignature, Pencil, FileText, Rocket, ExternalLink, Send } from "lucide-react";
import type { Lead, Contract, Onboarding } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { monthsBetween } from "@/lib/contractRevenue";
import { PACKAGE_META, notify } from "@/lib/onboarding";
import { fetchContractByLead } from "@/lib/queries/contracts";
import { formatDate, formatEuro, cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  lead: Lead;
  onEditDeal: () => void;
}

const PKG_BADGE: Record<string, string> = {
  Starter: "pkg-starter", Professional: "pkg-professional", Enterprise: "pkg-enterprise",
  Basic: "pkg-basic", Pro: "pkg-pro", Premium: "pkg-premium",
};

export default function DealContractSection({ lead, onEditDeal }: Props) {
  const supabase = createClient();
  const [contract, setContract] = useState<Contract | null>(null);
  const [onboarding, setOnboarding] = useState<Pick<Onboarding, "id" | "status" | "sla_signed"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => {
    (async () => {
      const c = await fetchContractByLead(supabase, lead.id);
      setContract(c);
      setOnboarding(c?.onboarding ?? null);
      setLoading(false);
    })();
  }, [lead.id, supabase]);

  if (loading) return <div className="skeleton h-40 rounded-2xl" />;

  if (!contract) {
    return (
      <div className="glass-card p-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#0F172A]">Close this deal to enter package details</h3>
          <p className="text-xs text-slate-500 mt-0.5">Capture the subscription, onboarding, contract and SLA in one step.</p>
        </div>
        <button onClick={onEditDeal} className="px-4 py-2 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors shrink-0">Enter Deal Details</button>
      </div>
    );
  }

  const phases = (contract.phases ?? []).slice().sort((a, b) => a.start_date.localeCompare(b.start_date));
  const subTotal = phases.reduce((s, p) => s + (p.monthly_price ?? 0) * monthsBetween(p.start_date, p.end_date), 0);
  const total = subTotal + (contract.onboarding_fee ?? 0);
  const signUrl = origin && contract.sign_token ? `${origin}/sign/${contract.sign_token}` : "";

  const slaStatus: string = onboarding?.sla_signed || contract.sla_status === "signed" ? "signed" : (contract.sla_status ?? "draft");
  const slaBadge = ({ draft: "bg-slate-100 text-slate-500", sent: "bg-blue-50 text-blue-600", viewed: "bg-indigo-50 text-indigo-600", signed: "bg-emerald-50 text-emerald-600" } as Record<string, string>)[slaStatus] ?? "bg-slate-100 text-slate-500";
  const onbStatusLabel = onboarding ? ({ not_started: "Not Started", in_progress: "In Progress", completed: "Completed", on_hold: "On Hold" }[onboarding.status]) : "—";

  const sendSla = async () => {
    if (!signUrl) { toast.error("Generate the SLA first (Edit Deal → Generate)"); return; }
    await supabase.from("contracts").update({ sla_status: "sent" }).eq("id", contract.id);
    setContract({ ...contract, sla_status: "sent" });
    // Notify the AM + log a lead activity, then open the pre-filled email.
    const { data: { user } } = await supabase.auth.getUser();
    if (lead.assigned_to) {
      await notify(supabase, { user_id: lead.assigned_to, type: "onboarding_created", title: "SLA sent", message: `SLA sent to ${lead.company_name} for signing`, lead_id: lead.id });
    }
    if (user) {
      await supabase.from("activities").insert({ lead_id: lead.id, user_id: user.id, type: "sla_sent", description: "SLA sent to client for signing", metadata: {} });
    }
    const subject = encodeURIComponent("Review & Sign Your Solar Flow Agreement");
    const body = encodeURIComponent(
      `Hi ${lead.contact_name ?? "there"},\n\nYour Solar Flow service agreement is ready to review and sign.\n\n` +
      `Review & Sign Your Agreement: ${signUrl}\n\nKind regards,\nThe Solar Flow team`,
    );
    window.location.href = `mailto:${lead.email ?? ""}?subject=${subject}&body=${body}`;
    toast.success("SLA sent");
  };

  return (
    <div className="glass-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
          <span className="w-7 h-7 rounded-lg bg-[#1B3A6B] text-white flex items-center justify-center"><FileSignature size={15} /></span>
          Deal &amp; Contract {contract.is_draft && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">Draft</span>}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onEditDeal} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B3A6B] text-white text-xs font-semibold rounded-lg hover:bg-[#152E55] transition-colors"><Pencil size={13} /> Edit Deal</button>
          {signUrl && contract.sla_status !== "draft" && (
            <a href={signUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"><FileText size={13} /> View SLA <ExternalLink size={10} /></a>
          )}
          {contract.onboarding_id && (
            <Link href={`/onboarding/${contract.onboarding_id}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"><Rocket size={13} /> View Onboarding</Link>
          )}
        </div>
      </div>

      {/* Section 1 — Packages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Subscription</p>
          {contract.subscription_package && <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", PKG_BADGE[contract.subscription_package])}>{contract.subscription_package}</span>}
          <p className="mt-2 text-lg font-extrabold text-[#1B3A6B]">
            {contract.subscription_discount && contract.subscription_original_amount ? (
              <><span className="text-sm text-slate-400 line-through font-normal mr-1.5">{formatEuro(contract.subscription_original_amount)}</span><span className="text-emerald-600">{formatEuro(contract.monthly_amount)}</span></>
            ) : formatEuro(contract.monthly_amount)}
            <span className="text-xs font-normal text-slate-400">/month</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">{contract.contract_duration_months ?? "—"} months · starts {contract.start_date ? formatDate(contract.start_date) : "—"}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total subscription value: <span className="font-semibold text-[#0F172A]">{formatEuro(subTotal)}</span></p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Onboarding</p>
          {contract.onboarding_package && <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", PKG_BADGE[contract.onboarding_package])}>{contract.onboarding_package}</span>}
          <p className="mt-2 text-lg font-extrabold text-[#1B3A6B]">
            {contract.onboarding_discount && contract.onboarding_original_fee ? (
              <><span className="text-sm text-slate-400 line-through font-normal mr-1.5">{formatEuro(contract.onboarding_original_fee)}</span><span className="text-emerald-600">{formatEuro(contract.onboarding_fee)}</span></>
            ) : formatEuro(contract.onboarding_fee)}
          </p>
          {contract.onboarding_package && <p className="text-xs text-slate-500 mt-1">{PACKAGE_META[contract.onboarding_package].summary}</p>}
        </div>
      </div>

      {/* Section 2 — Phases */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Pricing Phases</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[10px] text-slate-400 uppercase border-b border-slate-100">
              <th className="py-1.5">Phase</th><th>Monthly</th><th>Months</th><th>Start</th><th>End</th><th className="text-right">Phase Total</th>
            </tr></thead>
            <tbody>
              {phases.map((p, i) => { const m = monthsBetween(p.start_date, p.end_date); return (
                <tr key={p.id} className="border-b border-slate-50">
                  <td className="py-1.5">{i + 1}</td><td>{formatEuro(p.monthly_price)}</td><td>{m}</td><td>{formatDate(p.start_date)}</td><td>{formatDate(p.end_date)}</td><td className="text-right font-medium">{formatEuro(p.monthly_price * m)}</td>
                </tr>); })}
              <tr className="font-bold text-[#0F172A]"><td className="py-1.5" colSpan={5}>Total</td><td className="text-right">{formatEuro(subTotal)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", contract.payment_type === "upfront" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
            {contract.payment_type === "upfront" ? "Pay Upfront" : "Pay Monthly"}
          </span>
          {contract.payment_type === "upfront" && <span className="text-xs text-emerald-700 font-semibold">Upfront Payment Due: {formatEuro(total)}</span>}
        </div>
      </div>

      {/* Section 3 — Revenue summary */}
      <div className="rounded-xl bg-white/50 border border-slate-100 p-4 space-y-2">
        <Row label="Onboarding Fee" value={formatEuro(contract.onboarding_fee ?? 0)} />
        <Row label="Total Monthly Revenue" value={formatEuro(subTotal)} />
        <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
          <span className="text-sm font-bold text-[#0F172A]">Total Contract Value</span>
          <span className="text-xl font-extrabold text-[#1B3A6B]">{formatEuro(total)}</span>
        </div>
      </div>

      {/* Section 4 — Status row */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-white/60">
        <div className="flex items-center gap-3 flex-wrap mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase">SLA</span>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full capitalize", slaBadge)}>{slaStatus}{slaStatus === "signed" && contract.signed_at ? ` · ${formatDate(contract.signed_at)}` : ""}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase">Onboarding</span>
            {contract.onboarding_id ? (
              <Link href={`/onboarding/${contract.onboarding_id}`} className="text-xs font-semibold text-[#1B3A6B] hover:underline">{onbStatusLabel}</Link>
            ) : <span className="text-xs text-slate-400">—</span>}
          </div>
        </div>
        <div className="mt-3">
          {slaStatus === "draft" && (
            <button onClick={sendSla} className="flex items-center gap-1.5 px-4 py-2 bg-[#1B3A6B] text-white text-xs font-semibold rounded-lg hover:bg-[#152E55]"><Send size={13} /> Send SLA</button>
          )}
          {(slaStatus === "sent" || slaStatus === "viewed") && (
            <button onClick={sendSla} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"><Send size={13} /> Resend SLA</button>
          )}
          {slaStatus === "signed" && signUrl && (
            <a href={signUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700"><FileSignature size={13} /> View Signed SLA</a>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn("text-sm", subtle ? "text-slate-400" : "text-slate-600")}>{label}</span>
      <span className={cn("text-sm font-semibold", subtle ? "text-slate-400" : "text-[#0F172A]")}>{value}</span>
    </div>
  );
}
