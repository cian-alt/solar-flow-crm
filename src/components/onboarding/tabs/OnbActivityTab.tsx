'use client';

import { CheckCircle2, FileSignature, GraduationCap, Upload, Rocket, Eye, Flag } from "lucide-react";
import type { Onboarding, OnboardingStep, TrainingSession, OnboardingDocument } from "@/types/database";
import { formatRelativeTime } from "@/lib/utils";

interface Props {
  onboarding: Onboarding;
  steps: OnboardingStep[];
  training: TrainingSession[];
  documents: OnboardingDocument[];
}

interface Item {
  at: string;
  icon: React.ElementType;
  text: string;
  color: string;
}

// A computed timeline from the records we already have (no separate log table).
export default function OnbActivityTab({ onboarding, steps, training, documents }: Props) {
  const items: Item[] = [];

  items.push({ at: onboarding.created_at, icon: Flag, text: `Onboarding created (${onboarding.onboarding_package} package)`, color: "#1B3A6B" });
  if (onboarding.sla_signed && onboarding.sla_signed_at) items.push({ at: onboarding.sla_signed_at, icon: FileSignature, text: "SLA signed by client", color: "#059669" });
  if (onboarding.portal_last_viewed) items.push({ at: onboarding.portal_last_viewed, icon: Eye, text: "Client viewed the portal", color: "#7C3AED" });

  for (const s of steps) {
    if (s.status === "completed" && s.completed_at) {
      items.push({ at: s.completed_at, icon: s.step_type === "go_live" ? Rocket : CheckCircle2, text: `Step completed: ${s.title}${s.completer?.full_name ? ` (by ${s.completer.full_name})` : ""}`, color: s.step_type === "go_live" ? "#D97706" : "#059669" });
    }
  }
  for (const t of training) {
    if (t.scheduled_date) items.push({ at: t.scheduled_date, icon: GraduationCap, text: `Training ${t.status === "completed" ? "completed" : "scheduled"}: ${t.title}`, color: "#2563EB" });
  }
  for (const d of documents) {
    items.push({ at: d.created_at, icon: Upload, text: `Document uploaded: ${d.title}`, color: "#64748B" });
  }

  items.sort((a, b) => b.at.localeCompare(a.at));

  if (items.length === 0) return <p className="text-sm text-slate-400 text-center py-8">No activity yet.</p>;

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${it.color}1a`, color: it.color }}>
            <it.icon size={15} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm text-slate-700">{it.text}</p>
            <p className="text-[11px] text-slate-400">{formatRelativeTime(it.at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
