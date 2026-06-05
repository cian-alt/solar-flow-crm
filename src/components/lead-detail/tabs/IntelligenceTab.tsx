'use client';

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Sparkles, Package, Target, Clock, Lightbulb } from "lucide-react";
import type { Lead } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import {
  scoreLeadIntelligence,
  intelligenceUpdate,
  SUBSCRIPTION_TIERS,
  ONBOARDING_PACKAGES,
  type LeadEngagement,
} from "@/lib/leadScoring";
import { formatEuro, formatRelativeTime, cn } from "@/lib/utils";
import { CATEGORY_META, PACKAGE_BADGE_CLASS, contactMethodMeta } from "@/components/intelligence/helpers";
import ScoreGauge from "@/components/intelligence/ScoreGauge";
import ResearchFieldsForm, { type ResearchDraft } from "@/components/intelligence/ResearchFieldsForm";
import toast from "react-hot-toast";

interface Props {
  lead: Lead;
  engagement: LeadEngagement;
  onLeadChange: (updates: Partial<Lead>) => void;
}

function draftFromLead(lead: Lead): ResearchDraft {
  return {
    contractor_type: lead.contractor_type,
    jobs_per_week: lead.jobs_per_week,
    annual_turnover: lead.annual_turnover,
    num_employees: lead.num_employees,
    county: lead.county,
    uses_existing_software: lead.uses_existing_software,
    existing_software_name: lead.existing_software_name,
    linkedin_url: lead.linkedin_url,
    linkedin_activity: lead.linkedin_activity,
    preferred_contact_method: lead.preferred_contact_method,
    decision_maker_identified: lead.decision_maker_identified,
    decision_maker_name: lead.decision_maker_name,
    decision_maker_linkedin: lead.decision_maker_linkedin,
  };
}

export default function IntelligenceTab({ lead, engagement, onLeadChange }: Props) {
  const supabase = createClient();
  const [draft, setDraft] = useState<ResearchDraft>(() => draftFromLead(lead));
  const [saving, setSaving] = useState(false);

  const result = useMemo(
    () => scoreLeadIntelligence({ ...lead, ...draft }, engagement),
    [lead, draft, engagement],
  );
  const meta = CATEGORY_META[result.category];
  const primary = contactMethodMeta(result.primaryChannel);
  const secondary = contactMethodMeta(result.secondaryChannel);

  const persist = async (extra: Partial<Lead>) => {
    const { data: { user } } = await supabase.auth.getUser();
    const updates: Partial<Lead> = {
      ...extra,
      ...intelligenceUpdate(result),
      researched_by: user?.id ?? lead.researched_by,
      researched_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("leads")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", lead.id);
    if (error) {
      toast.error("Save failed — run the intelligence SQL migration in Supabase.");
      return;
    }
    onLeadChange(updates);
  };

  const saveAndRescore = async () => {
    setSaving(true);
    await persist(draft);
    setSaving(false);
    toast.success("Saved & re-scored");
  };

  const rescoreOnly = async () => {
    setSaving(true);
    await persist({});
    setSaving(false);
    toast.success("Re-scored");
  };

  return (
    <div className="space-y-5">
      {/* Score + category */}
      <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-white/50 border border-white/70">
        <ScoreGauge score={result.score} category={result.category} size={130} />
        <div className="flex-1 text-center sm:text-left">
          <span className={cn("inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wide", meta.pillClass)}>
            {meta.emoji} {meta.label}
          </span>
          <p className="text-sm text-slate-600 mt-2">{meta.description}</p>
          <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
            <span className="text-xs text-slate-400">
              {lead.researched_at ? `Last scored ${formatRelativeTime(lead.researched_at)}` : "Not yet scored"}
            </span>
            <button
              onClick={rescoreOnly}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4C1D95] hover:underline disabled:opacity-50"
            >
              <RefreshCw size={13} className={saving ? "animate-spin" : ""} /> Re-score
            </button>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {result.breakdown.map((c) => (
          <div key={c.label} className="p-3 rounded-xl bg-white/50 border border-white/60">
            <p className="text-[10px] text-slate-400 font-medium leading-tight">{c.label}</p>
            <p className="text-sm font-bold text-[#0F172A] mt-1">{c.points}<span className="text-slate-400 font-normal">/{c.max}</span></p>
          </div>
        ))}
      </div>

      {/* Package recommendation */}
      <div className="glass-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#0F172A] mb-4">
          <Package size={16} className="text-[#4C1D95]" /> Package Recommendation
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <RecCell label="Subscription" value={result.recommendedPackage ?? "—"}
            sub={result.recommendedPackage ? `${formatEuro(SUBSCRIPTION_TIERS[result.recommendedPackage].monthly)}/mo` : "Needs more data"}
            badgeClass={result.recommendedPackage ? PACKAGE_BADGE_CLASS[result.recommendedPackage] : undefined} />
          <RecCell label="Onboarding" value={result.recommendedOnboarding}
            sub={ONBOARDING_PACKAGES[result.recommendedOnboarding].fee === 0 ? "Free" : formatEuro(ONBOARDING_PACKAGES[result.recommendedOnboarding].fee)} />
          <RecCell label="Estimated MRR" value={formatEuro(result.estimatedMrr)} sub="per month" />
          <RecCell label="Est. First-Year Value" value={formatEuro(result.estimatedFirstYearValue)} sub="MRR × 12 + onboarding" />
        </div>
      </div>

      {/* AI analysis */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
          <Sparkles size={16} className="text-[#4C1D95]" /> AI Analysis
        </h3>
        <p className="text-sm leading-relaxed text-slate-700 bg-[#4C1D95]/5 border border-[#4C1D95]/15 rounded-xl p-4">
          {result.aiNotes}
        </p>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Lightbulb size={13} /> Talking points for first call
          </p>
          <ul className="space-y-1.5">
            {result.talkingPoints.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className="text-[#4C1D95] mt-0.5">•</span> <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock size={14} className="text-[#4C1D95]" />
          <span className="font-medium">Best time to call:</span> {result.bestTimeToCall}
        </div>
      </div>

      {/* Outreach recommendation */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
          <Target size={16} className="text-[#4C1D95]" /> Outreach Recommendation
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#4C1D95]/8 border border-[#4C1D95]/15">
            <span className="text-xl">{primary.emoji}</span>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Primary</p>
              <p className="text-sm font-semibold text-[#0F172A]">{primary.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 border border-white/70">
            <span className="text-xl">{secondary.emoji}</span>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Secondary</p>
              <p className="text-sm font-semibold text-[#0F172A]">{secondary.label}</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Suggested opener</p>
          <p className="text-sm italic text-slate-700 bg-white/50 border border-white/60 rounded-xl p-3">“{result.suggestedOpener}”</p>
        </div>
      </div>

      {/* Research fields */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0F172A]">Research Fields</h3>
          <span className="text-xs font-semibold text-slate-500">{result.researchFilled}/{result.researchTotal} filled</span>
        </div>
        <ResearchFieldsForm value={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={saveAndRescore}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl ai-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <RefreshCw size={16} className={saving ? "animate-spin" : ""} /> {saving ? "Saving…" : "Save & Re-score"}
        </motion.button>
      </div>
    </div>
  );
}

function RecCell({ label, value, sub, badgeClass }: { label: string; value: string; sub: string; badgeClass?: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
      {badgeClass ? (
        <span className={cn("inline-block mt-1 text-sm font-bold px-2.5 py-0.5 rounded-full", badgeClass)}>{value}</span>
      ) : (
        <p className="text-base font-bold text-[#0F172A] mt-1">{value}</p>
      )}
      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}
