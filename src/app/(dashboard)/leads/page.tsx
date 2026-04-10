'use client';

import { useState, useEffect, useCallback } from "react";
import { Plus, Download, LayoutGrid, List, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadStage, Profile } from "@/types/database";
import KanbanBoard from "@/components/leads/KanbanBoard";
import LeadTable from "@/components/leads/LeadTable";
import AddLeadDrawer from "@/components/leads/AddLeadDrawer";
import { STAGE_ORDER } from "@/lib/utils";
import toast from "react-hot-toast";

const LOCAL_STORAGE_KEY = "solarflow_leads_view";

export default function LeadsPage() {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "all">("all");
  const [filterAssigned, setFilterAssigned] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved === "table" || saved === "kanban") setView(saved);
  }, []);

  const switchView = (v: "kanban" | "table") => {
    setView(v);
    localStorage.setItem(LOCAL_STORAGE_KEY, v);
  };

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*, assigned_profile:profiles!assigned_to(id,full_name,avatar_initials,email)")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load leads");
    else setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }, []);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*");
    setProfiles((data as Profile[]) ?? []);
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchProfiles();
  }, [fetchLeads, fetchProfiles]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, fetchLeads)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  const filtered = leads.filter(l => {
    if (filterStage !== "all" && l.stage !== filterStage) return false;
    if (filterAssigned !== "all" && l.assigned_to !== filterAssigned) return false;
    if (filterSource !== "all" && l.lead_source !== filterSource) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.company_name.toLowerCase().includes(q) ||
        l.contact_name.toLowerCase().includes(q) ||
        (l.email?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ["Company", "Contact", "Email", "Phone", "Stage", "Deal Value", "System kW", "Source", "Assigned To", "Follow-up Date", "Lead Score"];
    const rows = filtered.map(l => [
      l.company_name, l.contact_name, l.email ?? "", l.phone ?? "",
      l.stage, l.deal_value ?? "", l.system_size_kw ?? "",
      l.lead_source ?? "", (l.assigned_profile as Profile | undefined)?.full_name ?? "",
      l.follow_up_date ?? "", l.lead_score,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "solar-flow-leads.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-[#0F172A]">Leads</h1>
          <span className="text-xs font-semibold bg-[#1B3A6B]/10 text-[#1B3A6B] px-2.5 py-1 rounded-full">
            {filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowAddDrawer(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors min-h-[40px]">
            <Plus size={16} /> Add Lead
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/60 border border-white/80 text-slate-600 text-sm font-medium rounded-xl hover:bg-white/80 transition-colors min-h-[40px]">
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30"
          />
        </div>

        <select value={filterStage} onChange={e => setFilterStage(e.target.value as LeadStage | "all")}
          className="px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm text-slate-600 focus:outline-none min-h-[40px]">
          <option value="all">All Stages</option>
          {STAGE_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}
          className="px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm text-slate-600 focus:outline-none min-h-[40px]">
          <option value="all">All Reps</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>)}
        </select>

        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
          className="px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm text-slate-600 focus:outline-none min-h-[40px]">
          <option value="all">All Sources</option>
          {["Website","Referral","Cold Call","LinkedIn","Trade Show","Google Ads","Facebook Ads","Partner","Other"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white/60 border border-white/80 rounded-xl p-1 ml-auto">
          <button onClick={() => switchView("kanban")}
            className={`p-1.5 rounded-lg transition-colors ${view === "kanban" ? "bg-[#1B3A6B] text-white" : "text-slate-500 hover:bg-slate-100"}`}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => switchView("table")}
            className={`p-1.5 rounded-lg transition-colors ${view === "table" ? "bg-[#1B3A6B] text-white" : "text-slate-500 hover:bg-slate-100"}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* View */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard leads={filtered} onLeadsChange={setLeads} />
      ) : (
        <LeadTable leads={filtered} onLeadsChange={setLeads} />
      )}

      <AddLeadDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        profiles={profiles}
        onLeadAdded={fetchLeads}
      />
    </div>
  );
}
