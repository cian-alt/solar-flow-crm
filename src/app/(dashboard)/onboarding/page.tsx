'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Rocket, CheckCircle2, AlertCircle, FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, Profile, Onboarding, OnboardingStep, OnboardingStatus, OnboardingPackage } from "@/types/database";
import { isStepOverdue } from "@/lib/onboarding";
import { startOfMonth } from "date-fns";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import NewOnboardingModal from "@/components/onboarding/NewOnboardingModal";

export default function OnboardingPage() {
  const supabase = createClient();
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [stepsByOnb, setStepsByOnb] = useState<Map<string, OnboardingStep[]>>(new Map());
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const [fStatus, setFStatus] = useState<OnboardingStatus | "all">("all");
  const [fPackage, setFPackage] = useState<OnboardingPackage | "all">("all");
  const [fAm, setFAm] = useState("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [onbRes, stepRes, profRes, leadRes] = await Promise.all([
      supabase.from("onboardings").select("*, am_profile:profiles!assigned_am(id,full_name,avatar_initials,avatar_url,email)").order("created_at", { ascending: false }),
      supabase.from("onboarding_steps").select("id, onboarding_id, status, due_date, title, order_index"),
      supabase.from("profiles").select("*"),
      supabase.from("leads").select("id, company_name, contact_name, email, phone, assigned_to, recommended_onboarding, stage").order("company_name"),
    ]);
    setOnboardings((onbRes.data as Onboarding[]) ?? []);
    const map = new Map<string, OnboardingStep[]>();
    for (const s of ((stepRes.data ?? []) as OnboardingStep[])) {
      const arr = map.get(s.onboarding_id) ?? [];
      arr.push(s);
      map.set(s.onboarding_id, arr);
    }
    setStepsByOnb(map);
    setProfiles((profRes.data as Profile[]) ?? []);
    setLeads((leadRes.data as Lead[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const stepsFor = useCallback((id: string) => stepsByOnb.get(id) ?? [], [stepsByOnb]);

  const summary = useMemo(() => {
    const monthStart = startOfMonth(new Date()).toISOString();
    let active = 0, completedThisMonth = 0, overdueSteps = 0, awaitingSla = 0;
    for (const o of onboardings) {
      if (o.status === "not_started" || o.status === "in_progress") active++;
      if (o.status === "completed" && o.updated_at >= monthStart) completedThisMonth++;
      if (!o.sla_signed) awaitingSla++;
      for (const s of stepsFor(o.id)) if (isStepOverdue(s)) overdueSteps++;
    }
    return { active, completedThisMonth, overdueSteps, awaitingSla };
  }, [onboardings, stepsFor]);

  const filtered = useMemo(() => {
    return onboardings.filter((o) => {
      if (fStatus !== "all" && o.status !== fStatus) return false;
      if (fPackage !== "all" && o.onboarding_package !== fPackage) return false;
      if (fAm !== "all" && o.assigned_am !== fAm) return false;
      if (fFrom && o.created_at < fFrom) return false;
      if (fTo && o.created_at > fTo + "T23:59:59") return false;
      return true;
    });
  }, [onboardings, fStatus, fPackage, fAm, fFrom, fTo]);

  const selectClass = "px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm text-slate-600 focus:outline-none min-h-[40px]";
  const cards = [
    { label: "Total Active", value: summary.active, icon: Rocket, color: "#2563EB" },
    { label: "Completed This Month", value: summary.completedThisMonth, icon: CheckCircle2, color: "#059669" },
    { label: "Overdue Steps", value: summary.overdueSteps, icon: AlertCircle, color: "#DC2626" },
    { label: "Awaiting SLA", value: summary.awaitingSla, icon: FileSignature, color: "#D97706" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-[#0F172A]">Client Onboarding</h1>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors min-h-[40px]">
          <Plus size={16} /> New Onboarding
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="glass-card p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5" style={{ color: c.color }}>
              <c.icon size={15} />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</span>
            </div>
            <span className="text-2xl font-extrabold text-[#0F172A]">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as OnboardingStatus | "all")} className={selectClass}>
          <option value="all">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
        </select>
        <select value={fPackage} onChange={(e) => setFPackage(e.target.value as OnboardingPackage | "all")} className={selectClass}>
          <option value="all">All Packages</option>
          <option value="Basic">Basic</option>
          <option value="Pro">Pro</option>
          <option value="Premium">Premium</option>
        </select>
        <select value={fAm} onChange={(e) => setFAm(e.target.value)} className={selectClass}>
          <option value="all">All AMs</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>)}
        </select>
        <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className={selectClass} aria-label="From date" />
        <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className={selectClass} aria-label="To date" />
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Rocket size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No onboardings yet</p>
          <p className="text-sm text-slate-400 mt-1">They&apos;re created automatically when a lead is marked Closed Won, or add one manually.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((o) => <OnboardingCard key={o.id} onboarding={o} steps={stepsFor(o.id)} />)}
        </div>
      )}

      <NewOnboardingModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        leads={leads}
        profiles={profiles}
        onCreated={() => fetchAll()}
      />
    </div>
  );
}
