'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Briefcase, Users, PhoneCall, CalendarPlus, ArrowRight } from "lucide-react";
import type { Lead } from "@/types/database";
import type { IntelligenceResult } from "@/lib/leadScoring";
import { cn } from "@/lib/utils";
import { CATEGORY_META, PACKAGE_BADGE_CLASS, contactMethodMeta } from "./helpers";

interface Props {
  lead: Lead;
  result: IntelligenceResult;
  onScheduleDemo: (lead: Lead) => void;
}

export default function IntelligenceLeadCard({ lead, result, onScheduleDemo }: Props) {
  const meta = CATEGORY_META[result.category];
  const primary = contactMethodMeta(result.recommendedContactMethod);
  const completePct = Math.round((result.researchFilled / result.researchTotal) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("glass-card p-5 flex flex-col gap-4 border", meta.glowClass)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[#0F172A] truncate">{lead.company_name}</h3>
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            {lead.county && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                <MapPin size={11} /> {lead.county}
              </span>
            )}
            {lead.contractor_type && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#4C1D95]/10 text-[#4C1D95] px-2 py-0.5 rounded-full">
                <Briefcase size={11} /> {lead.contractor_type}
              </span>
            )}
          </div>
        </div>
        {/* Score */}
        <div className="flex flex-col items-center shrink-0">
          <span className="text-3xl font-extrabold leading-none" style={{ color: meta.hex }}>
            {result.score}
          </span>
          <span className={cn("mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", meta.pillClass)}>
            {meta.emoji} {meta.label}
          </span>
        </div>
      </div>

      {/* Package + stats */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {result.recommendedPackage ? (
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", PACKAGE_BADGE_CLASS[result.recommendedPackage])}>
            {result.recommendedPackage} · €{result.recommendedPackagePrice.toLocaleString("en-IE")}/mo
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-400">No package fit yet</span>
        )}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Briefcase size={13} /> {lead.jobs_per_week ?? "—"}/wk
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={13} /> {lead.num_employees ?? "—"}
          </span>
        </div>
      </div>

      {/* Contact method + decision maker */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-slate-700">
          <span className="text-base">{primary.emoji}</span>
          <span className="font-medium">{primary.label}</span>
        </span>
        {lead.decision_maker_identified && lead.decision_maker_name && (
          <span className="text-xs text-slate-500 truncate">DM: {lead.decision_maker_name}</span>
        )}
      </div>

      {/* AI notes */}
      <p className="text-xs leading-relaxed text-slate-600 bg-white/50 rounded-xl p-3 border border-white/60">
        {result.aiNotes}
      </p>

      {/* Research completeness */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
          <span>Research completeness</span>
          <span className="font-semibold">{result.researchFilled}/{result.researchTotal} fields</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#4C1D95]"
            initial={{ width: 0 }}
            animate={{ width: `${completePct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Link
          href={`/leads/${lead.id}`}
          className="flex items-center justify-center gap-1.5 flex-1 h-9 rounded-lg bg-white/70 border border-white/80 text-xs font-semibold text-slate-600 hover:bg-white transition-colors"
        >
          <PhoneCall size={14} /> Log Call
        </Link>
        <button
          onClick={() => onScheduleDemo(lead)}
          className="flex items-center justify-center gap-1.5 flex-1 h-9 rounded-lg bg-white/70 border border-white/80 text-xs font-semibold text-slate-600 hover:bg-white transition-colors"
        >
          <CalendarPlus size={14} /> Demo
        </button>
        <Link
          href={`/leads/${lead.id}`}
          className="flex items-center justify-center gap-1.5 flex-1 h-9 rounded-lg bg-[#1B3A6B] text-xs font-semibold text-white hover:bg-[#152E55] transition-colors"
        >
          View <ArrowRight size={14} />
        </Link>
      </div>
    </motion.div>
  );
}
