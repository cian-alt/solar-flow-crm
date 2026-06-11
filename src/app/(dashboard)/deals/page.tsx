'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileSignature, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Contract } from "@/types/database";
import { monthsBetween } from "@/lib/contractRevenue";
import { formatDate, formatEuro, cn } from "@/lib/utils";

type DealRow = Contract & { lead: { id: string; company_name: string; stage: string } | null };

const SLA_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-500", sent: "bg-blue-50 text-blue-600",
  viewed: "bg-indigo-50 text-indigo-600", signed: "bg-emerald-50 text-emerald-600",
};
const PKG_BADGE: Record<string, string> = { Starter: "pkg-starter", Professional: "pkg-professional", Enterprise: "pkg-enterprise" };

export default function DealsPage() {
  const supabase = createClient();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contracts")
      .select("*, phases:contract_phases(*), lead:leads!lead_id(id, company_name, stage)")
      .order("created_at", { ascending: false });
    setDeals((data as DealRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const dealTotal = (d: DealRow) =>
    (d.phases ?? []).reduce((s, p) => s + (p.monthly_price ?? 0) * monthsBetween(p.start_date, p.end_date), 0) + (d.onboarding_fee ?? 0);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-[#0F172A]">Deals</h1>

      {loading ? (
        <div className="grid grid-cols-1 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : deals.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FileSignature size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No deals yet</p>
          <p className="text-sm text-slate-400 mt-1">Deals appear here once a lead is closed and a contract is created.</p>
        </div>
      ) : (
        <div className="glass-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-400 uppercase tracking-wide border-b border-white/60">
                  <th className="px-4 py-3">Company</th><th className="px-4 py-3">Subscription</th><th className="px-4 py-3">Monthly</th>
                  <th className="px-4 py-3">Contract Value</th><th className="px-4 py-3">Start</th><th className="px-4 py-3">SLA</th><th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id} className="border-b border-white/40 hover:bg-white/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{d.lead?.company_name ?? d.official_company_name ?? "—"}</td>
                    <td className="px-4 py-3">{d.subscription_package ? <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", PKG_BADGE[d.subscription_package])}>{d.subscription_package}</span> : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatEuro(d.monthly_amount)}</td>
                    <td className="px-4 py-3 font-semibold text-[#1B3A6B]">{formatEuro(dealTotal(d))}</td>
                    <td className="px-4 py-3 text-slate-500">{d.start_date ? formatDate(d.start_date) : "—"}</td>
                    <td className="px-4 py-3"><span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize", SLA_BADGE[d.sla_status ?? "draft"])}>{d.sla_status ?? "draft"}</span></td>
                    <td className="px-4 py-3 text-right">{d.lead && <Link href={`/leads/${d.lead.id}`} className="inline-flex items-center gap-1 text-[#1B3A6B] hover:underline text-xs font-semibold">View lead <ArrowRight size={12} /></Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
