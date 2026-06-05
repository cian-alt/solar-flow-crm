'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { X, SkipForward, Save, Sparkles } from "lucide-react";
import type { Lead } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import {
  scoreLeadIntelligence,
  intelligenceUpdate,
  type LeadEngagement,
} from "@/lib/leadScoring";
import toast from "react-hot-toast";
import ResearchFieldsForm, { type ResearchDraft } from "./ResearchFieldsForm";
import ScoreGauge from "./ScoreGauge";

interface Props {
  leads: Lead[];
  engagementFor: (leadId: string) => LeadEngagement;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
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

export default function BulkResearchMode({ leads, engagementFor, onClose, onSaved }: Props) {
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<ResearchDraft>(() => (leads[0] ? draftFromLead(leads[0]) : {} as ResearchDraft));
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const current = leads[index];

  useEffect(() => {
    if (current) setDraft(draftFromLead(current));
  }, [current]);

  const livePreview = useMemo(() => {
    if (!current) return null;
    return scoreLeadIntelligence({ ...current, ...draft }, engagementFor(current.id));
  }, [current, draft, engagementFor]);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, leads.length));
  }, [leads.length]);

  const saveAndNext = useCallback(async () => {
    if (!current || saving) return;
    setSaving(true);
    const merged = { ...current, ...draft };
    const result = scoreLeadIntelligence(merged, engagementFor(current.id));
    const { data: { user } } = await supabase.auth.getUser();
    const updates: Partial<Lead> = {
      ...draft,
      ...intelligenceUpdate(result),
      researched_by: user?.id ?? current.researched_by,
      researched_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("leads")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", current.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save research");
      return;
    }
    onSaved({ ...merged, ...updates });
    toast.success(`Saved ${current.company_name}`);
    goNext();
  }, [current, draft, saving, supabase, engagementFor, onSaved, goNext]);

  // Keyboard navigation: Enter → save & next, Escape → close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "TEXTAREA") {
          e.preventDefault();
          saveAndNext();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, saveAndNext]);

  const allDone = index >= leads.length || leads.length === 0;
  const progressPct = leads.length === 0 ? 100 : Math.round((index / leads.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-[#1B0F3B] via-[#2A1A5E] to-[#1B3A6B] overflow-y-auto"
    >
      <div className="min-h-full flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 text-white/90">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#C4B5FD]" />
            <span className="font-semibold">Bulk Research Mode</span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
          >
            <X size={18} /> Exit
          </button>
        </div>

        {/* Progress */}
        <div className="px-6">
          <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
            <span>{allDone ? "All leads researched" : `Researching lead ${index + 1} of ${leads.length}`}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#A78BFA]"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 flex items-start justify-center p-6">
          {allDone ? (
            <div className="text-center text-white mt-20">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">Research complete</h2>
              <p className="text-white/70 mb-6">You&apos;ve worked through every lead in this list.</p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white text-[#1B3A6B] font-semibold hover:bg-white/90 transition-colors"
              >
                Back to Intelligence
              </button>
            </div>
          ) : (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]">{current.company_name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{current.contact_name}</p>
                </div>
                {livePreview && (
                  <ScoreGauge score={livePreview.score} category={livePreview.category} size={84} />
                )}
              </div>

              <ResearchFieldsForm value={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={goNext}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <SkipForward size={16} /> Skip
                </button>
                <button
                  onClick={saveAndNext}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4C1D95] text-sm font-semibold text-white hover:bg-[#3B0F73] transition-colors disabled:opacity-60"
                >
                  <Save size={16} /> {saving ? "Saving…" : "Save & Next"}
                  <kbd className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">⏎</kbd>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
