'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, Clock } from "lucide-react";
import type { Onboarding, OnboardingStep } from "@/types/database";
import Avatar from "@/components/ui/Avatar";
import { cn, formatDate } from "@/lib/utils";
import { onboardingProgress, isStepOverdue, PACKAGE_META } from "@/lib/onboarding";
import { ONBOARDING_STATUS_META, progressColor } from "./helpers";

interface Props {
  onboarding: Onboarding;
  steps: OnboardingStep[];
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

export default function OnboardingCard({ onboarding, steps }: Props) {
  const { completed, total, pct } = onboardingProgress(steps);
  const pkg = PACKAGE_META[onboarding.onboarding_package];
  const statusMeta = ONBOARDING_STATUS_META[onboarding.status];

  const nextStep = [...steps]
    .filter((s) => s.status !== "completed" && s.status !== "skipped")
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.order_index - b.order_index)[0];
  const nextOverdue = nextStep ? isStepOverdue(nextStep) : false;

  return (
    <Link href={`/onboarding/${onboarding.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="glass-card p-5 flex flex-col gap-3.5 hover:scale-[1.01] transition-transform cursor-pointer h-full"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#0F172A] truncate">{onboarding.client_company_name}</h3>
            <span className={cn("inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full", pkg.badgeClass)}>
              {pkg.label}
            </span>
          </div>
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0", statusMeta.pillClass)}>
            {statusMeta.label}
          </span>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>{completed} of {total} steps</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: progressColor(pct) }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Next step */}
        {nextStep ? (
          <div className={cn("flex items-center gap-2 text-xs", nextOverdue ? "text-red-600" : "text-slate-600")}>
            {nextOverdue ? <AlertCircle size={13} /> : <Clock size={13} />}
            <span className="truncate">Next: {nextStep.title}</span>
            <span className="ml-auto shrink-0 font-medium">{formatDate(nextStep.due_date)}</span>
          </div>
        ) : (
          <div className="text-xs text-emerald-600 font-medium">All steps complete 🎉</div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 mt-auto border-t border-white/50">
          <div className="flex items-center gap-2">
            <Avatar name={onboarding.am_profile?.full_name ?? "Unassigned"} src={onboarding.am_profile?.avatar_url} size="sm" />
            <span className="text-xs text-slate-500 truncate max-w-[120px]">
              {onboarding.am_profile?.full_name ?? "Unassigned"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">{daysSince(onboarding.created_at)}d since start</span>
        </div>
      </motion.div>
    </Link>
  );
}
