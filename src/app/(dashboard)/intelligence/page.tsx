'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Brain, RefreshCw, Wand2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, Profile, IntelligenceCategory } from "@/types/database";
import {
  scoreLeadIntelligence,
  intelligenceUpdate,
  CONTRACTOR_TYPES,
  IRISH_COUNTIES,
  type IntelligenceResult,
  type LeadEngagement,
} from "@/lib/leadScoring";
import { formatRelativeTime } from "@/lib/utils";
import { CATEGORY_META, CATEGORY_ORDER } from "@/components/intelligence/helpers";
import SummaryCards, { type IntelligenceStats } from "@/components/intelligence/SummaryCards";
import IntelligenceLeadCard from "@/components/intelligence/IntelligenceLeadCard";
import BulkResearchMode from "@/components/intelligence/BulkResearchMode";
import toast from "react-hot-toast";

type SortKey = "score-desc" | "score-asc" | "company" | "jobs" | "mrr";

interface Scored {
  lead: Lead;
  result: IntelligenceResult;
}

const EMPTY_ENGAGEMENT: LeadEngagement = { hasCall: false, hasNotes: false, hasFollowUp: false, hasAnsweredCall: false };

export default function IntelligencePage() {
  const supabase = createClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [callsByLead, setCallsByLead] = useState<Map<string, string[]>>(new Map());
  const [noteLeadIds, setNoteLeadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [rescoring, setRescoring] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Tabs + filters
  const [tab, setTab] = useState<IntelligenceCategory>("Hot");
  const [search, setSearch] = useState("");
  const [filterCounty, setFilterCounty] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterPackage, setFilterPackage] = useState("all");
  const [filterAm, setFilterAm] = useState("all");
  const [filterResearch, setFilterResearch] = useState<"all" | "complete" | "incomplete">("all");
  const [sort, setSort] = useState<SortKey>("score-desc");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [leadsRes, profilesRes, callsRes, notesRes] = await Promise.all([
      supabase.from("leads").select("*, assigned_profile:profiles!assigned_to(id,full_name,avatar_initials,email)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("calls").select("lead_id, outcome"),
      supabase.from("notes").select("lead_id"),
    ]);
    setLeads((leadsRes.data as Lead[]) ?? []);
    setProfiles((profilesRes.data as Profile[]) ?? []);

    const cMap = new Map<string, string[]>();
    for (const c of (callsRes.data ?? []) as { lead_id: string; outcome: string }[]) {
      const arr = cMap.get(c.lead_id) ?? [];
      arr.push(c.outcome);
      cMap.set(c.lead_id, arr);
    }
    setCallsByLead(cMap);
    setNoteLeadIds(new Set(((notesRes.data ?? []) as { lead_id: string }[]).map((n) => n.lead_id)));
    setLastUpdated(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const engagementFor = useCallback((leadId: string, followUp?: string | null): LeadEngagement => {
    const outcomes = callsByLead.get(leadId);
    return {
      hasCall: !!outcomes && outcomes.length > 0,
      hasNotes: noteLeadIds.has(leadId),
      hasFollowUp: !!followUp,
      hasAnsweredCall: !!outcomes && outcomes.includes("answered"),
    };
  }, [callsByLead, noteLeadIds]);

  const scored: Scored[] = useMemo(() => {
    return leads.map((lead) => ({
      lead,
      result: scoreLeadIntelligence(lead, engagementFor(lead.id, lead.follow_up_date)),
    }));
  }, [leads, engagementFor]);

  const stats: IntelligenceStats = useMemo(() => {
    const byCategory: Record<IntelligenceCategory, number> = { Hot: 0, Warm: 0, Nurture: 0, Cold: 0 };
    let potentialMrrHot = 0;
    let potentialMrrWarm = 0;
    for (const s of scored) {
      byCategory[s.result.category] += 1;
      if (s.result.category === "Hot") potentialMrrHot += s.result.estimatedMrr;
      if (s.result.category === "Warm") potentialMrrWarm += s.result.estimatedMrr;
    }
    return { totalScored: scored.length, byCategory, potentialMrrHot, potentialMrrWarm };
  }, [scored]);

  // Apply filters (excluding category) + search
  const filteredAll = useMemo(() => {
    return scored.filter(({ lead, result }) => {
      if (filterCounty !== "all" && lead.county !== filterCounty) return false;
      if (filterType !== "all" && lead.contractor_type !== filterType) return false;
      if (filterPackage !== "all" && result.recommendedPackage !== filterPackage) return false;
      if (filterAm !== "all" && lead.assigned_to !== filterAm) return false;
      if (filterResearch === "complete" && result.researchFilled < result.researchTotal) return false;
      if (filterResearch === "incomplete" && result.researchFilled >= result.researchTotal) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!lead.company_name.toLowerCase().includes(q) && !lead.contact_name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [scored, filterCounty, filterType, filterPackage, filterAm, filterResearch, search]);

  const tabResults = useMemo(() => {
    const inTab = filteredAll.filter((s) => s.result.category === tab);
    const sorted = [...inTab].sort((a, b) => {
      switch (sort) {
        case "score-asc": return a.result.score - b.result.score;
        case "company": return a.lead.company_name.localeCompare(b.lead.company_name);
        case "jobs": return (b.lead.jobs_per_week ?? 0) - (a.lead.jobs_per_week ?? 0);
        case "mrr": return b.result.estimatedMrr - a.result.estimatedMrr;
        default: return b.result.score - a.result.score;
      }
    });
    return sorted;
  }, [filteredAll, tab, sort]);

  const researchProgress = useMemo(() => {
    const inTab = filteredAll.filter((s) => s.result.category === tab);
    const done = inTab.filter((s) => s.result.researchFilled >= s.result.researchTotal).length;
    return { done, total: inTab.length };
  }, [filteredAll, tab]);

  const updateLeadLocal = useCallback((updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
  }, []);

  const rescoreAll = useCallback(async () => {
    if (rescoring || scored.length === 0) return;
    setRescoring(true);
    try {
      const chunkSize = 20;
      for (let i = 0; i < scored.length; i += chunkSize) {
        const chunk = scored.slice(i, i + chunkSize);
        await Promise.all(chunk.map(({ lead, result }) =>
          supabase.from("leads").update({ ...intelligenceUpdate(result), updated_at: new Date().toISOString() }).eq("id", lead.id),
        ));
      }
      setLastUpdated(new Date().toISOString());
      toast.success(`Re-scored ${scored.length} leads`);
    } catch {
      toast.error("Re-score failed — have you run the intelligence SQL migration?");
    } finally {
      setRescoring(false);
    }
  }, [rescoring, scored, supabase]);

  const scheduleDemo = useCallback(async (lead: Lead) => {
    updateLeadLocal({ ...lead, stage: "Demo Scheduled" });
    const { error } = await supabase.from("leads").update({ stage: "Demo Scheduled", updated_at: new Date().toISOString() }).eq("id", lead.id);
    if (error) toast.error("Failed to update stage");
    else toast.success(`Demo scheduled with ${lead.company_name}`);
  }, [supabase, updateLeadLocal]);

  const selectClass = "px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm text-slate-600 focus:outline-none min-h-[40px]";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl ai-gradient text-white">
              <Brain size={18} />
            </span>
            <span className="ai-gradient-text">Lead Intelligence</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">AI-powered demo conversion engine</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 self-center">
            {lastUpdated ? `Updated ${formatRelativeTime(lastUpdated)}` : ""}
          </span>
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/60 border border-white/80 text-[#4C1D95] text-sm font-semibold rounded-xl hover:bg-white/80 transition-colors min-h-[40px]"
          >
            <Wand2 size={16} /> Bulk Research
          </button>
          <button
            onClick={rescoreAll}
            disabled={rescoring}
            className="flex items-center gap-1.5 px-4 py-2 ai-gradient text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity min-h-[40px] disabled:opacity-60"
          >
            <RefreshCw size={16} className={rescoring ? "animate-spin" : ""} /> {rescoring ? "Re-scoring…" : "Re-score All Leads"}
          </button>
        </div>
      </div>

      {/* Summary */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : (
        <SummaryCards stats={stats} />
      )}

      {/* Category tabs */}
      <div className="flex items-center gap-1 bg-white/50 border border-white/70 rounded-xl p-1 w-full sm:w-auto overflow-x-auto">
        {CATEGORY_ORDER.map((cat) => {
          const meta = CATEGORY_META[cat];
          const active = tab === cat;
          return (
            <button
              key={cat}
              onClick={() => setTab(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                active ? "bg-[#1B3A6B] text-white shadow-sm" : "text-slate-500 hover:bg-white/70"
              }`}
            >
              <span>{meta.emoji}</span> {meta.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>
                {stats.byCategory[cat]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/30 min-h-[40px]"
          />
        </div>
        <select value={filterCounty} onChange={(e) => setFilterCounty(e.target.value)} className={selectClass}>
          <option value="all">All Counties</option>
          {IRISH_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectClass}>
          <option value="all">All Types</option>
          {CONTRACTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterPackage} onChange={(e) => setFilterPackage(e.target.value)} className={selectClass}>
          <option value="all">All Packages</option>
          {["Starter", "Professional", "Enterprise"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterAm} onChange={(e) => setFilterAm(e.target.value)} className={selectClass}>
          <option value="all">All AMs</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>)}
        </select>
        <select value={filterResearch} onChange={(e) => setFilterResearch(e.target.value as typeof filterResearch)} className={selectClass}>
          <option value="all">All Research</option>
          <option value="complete">Fully researched</option>
          <option value="incomplete">Needs research</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${selectClass} ml-auto`}>
          <option value="score-desc">Score (high → low)</option>
          <option value="score-asc">Score (low → high)</option>
          <option value="company">Company Name</option>
          <option value="jobs">Jobs / Week</option>
          <option value="mrr">Estimated MRR</option>
        </select>
      </div>

      {/* Research progress bar for active category */}
      {!loading && researchProgress.total > 0 && (
        <div className="glass-sm p-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>{researchProgress.done} of {researchProgress.total} {tab} leads fully researched — complete research to improve scoring accuracy</span>
            <span className="font-semibold text-[#4C1D95]">{Math.round((researchProgress.done / researchProgress.total) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full rounded-full bg-[#4C1D95] transition-all" style={{ width: `${(researchProgress.done / researchProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-72 rounded-2xl" />)}
        </div>
      ) : tabResults.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-3">{CATEGORY_META[tab].emoji}</div>
          <p className="text-slate-600 font-medium">No {tab} leads match your filters</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting filters or run Bulk Research to score more leads.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tabResults.map(({ lead, result }) => (
            <IntelligenceLeadCard key={lead.id} lead={lead} result={result} onScheduleDemo={scheduleDemo} />
          ))}
        </div>
      )}

      {/* Bulk research overlay */}
      <AnimatePresence>
        {bulkOpen && (
          <BulkResearchMode
            leads={leads}
            engagementFor={(id) => {
              const l = leads.find((x) => x.id === id);
              return l ? engagementFor(id, l.follow_up_date) : EMPTY_ENGAGEMENT;
            }}
            onClose={() => setBulkOpen(false)}
            onSaved={updateLeadLocal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
