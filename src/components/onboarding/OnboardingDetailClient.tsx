'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Copy, Send, ListChecks, GraduationCap, FileText, Activity as ActivityIcon, Rocket } from "lucide-react";
import type { Onboarding, OnboardingStep, TrainingSession, OnboardingDocument, Profile, OnboardingStatus } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { onboardingProgress, PACKAGE_META } from "@/lib/onboarding";
import { ONBOARDING_STATUS_META, progressColor } from "./helpers";
import { cn, formatDate } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import StepsTab from "./tabs/StepsTab";
import TrainingTab from "./tabs/TrainingTab";
import OnbDocumentsTab from "./tabs/OnbDocumentsTab";
import OnbActivityTab from "./tabs/OnbActivityTab";
import toast from "react-hot-toast";

type Tab = "steps" | "training" | "documents" | "activity";

interface Props {
  onboarding: Onboarding;
  initialSteps: OnboardingStep[];
  initialTraining: TrainingSession[];
  initialDocuments: OnboardingDocument[];
  profiles: Profile[];
}

export default function OnboardingDetailClient({ onboarding: initial, initialSteps, initialTraining, initialDocuments, profiles }: Props) {
  const supabase = createClient();
  const [onboarding, setOnboarding] = useState(initial);
  const [steps, setSteps] = useState(initialSteps);
  const [training, setTraining] = useState(initialTraining);
  const [documents, setDocuments] = useState(initialDocuments);
  const [tab, setTab] = useState<Tab>("steps");
  const [origin, setOrigin] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [sendBody, setSendBody] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const portalUrl = origin ? `${origin}/portal/${onboarding.portal_token}` : "";
  const { completed, total, pct } = onboardingProgress(steps);
  const pkg = PACKAGE_META[onboarding.onboarding_package];
  const statusMeta = ONBOARDING_STATUS_META[onboarding.status];

  const updateOnboarding = async (updates: Partial<Onboarding>) => {
    setOnboarding((o) => ({ ...o, ...updates }));
    const { error } = await supabase.from("onboardings").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", onboarding.id);
    if (error) toast.error("Failed to save");
  };

  const copyLink = async () => {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    toast.success("Copied!");
  };

  const openSend = () => {
    setSendTo(onboarding.client_contact_email ?? "");
    setSendSubject("Your Solar Flow onboarding portal");
    setSendBody(
      `Hi ${onboarding.client_contact_name ?? "there"},\n\n` +
      `Welcome to Solar Flow! We're delighted to have ${onboarding.client_company_name} on board.\n\n` +
      `You can track your onboarding progress, view training sessions and access your documents any time using your personal portal:\n${portalUrl}\n\n` +
      `If you have any questions, just reply to this email.\n\nKind regards,\nYour Solar Flow team`,
    );
    setSendOpen(true);
  };

  const sendLink = () => {
    window.location.href = `mailto:${encodeURIComponent(sendTo)}?subject=${encodeURIComponent(sendSubject)}&body=${encodeURIComponent(sendBody)}`;
    setSendOpen(false);
    toast.success("Opening your email client…");
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "steps", label: "Onboarding Steps", icon: ListChecks, count: total },
    { id: "training", label: "Training Sessions", icon: GraduationCap, count: training.length },
    { id: "documents", label: "Documents", icon: FileText, count: documents.length },
    { id: "activity", label: "Activity", icon: ActivityIcon },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/onboarding" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1B3A6B] transition-colors">
          <ArrowLeft size={16} /> Back to Onboarding
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-700 font-medium">{onboarding.client_company_name}</span>
      </div>

      {/* Header card */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#1B3A6B] text-white flex items-center justify-center shrink-0">
              <Rocket size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">{onboarding.client_company_name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", pkg.badgeClass)}>{pkg.label} · {pkg.fee === 0 ? "Free" : "€" + pkg.fee.toLocaleString("en-IE")}</span>
                <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", statusMeta.pillClass)}>{statusMeta.label}</span>
                {onboarding.go_live_date && <span className="text-xs text-slate-500">Go live: {formatDate(onboarding.go_live_date)}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={onboarding.status}
              onChange={(e) => updateOnboarding({ status: e.target.value as OnboardingStatus })}
              className="px-3 py-2 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
            <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-2 bg-white/60 border border-white/80 text-slate-600 text-sm font-medium rounded-xl hover:bg-white/80 transition-colors min-h-[40px]">
              <Copy size={15} /> Copy Portal Link
            </button>
            <button onClick={openSend} className="flex items-center gap-1.5 px-3 py-2 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors min-h-[40px]">
              <Send size={15} /> Send Portal Link
            </button>
          </div>
        </div>

        {/* Progress + AM */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{completed} of {total} steps complete</span>
              <span className="font-semibold">{pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: progressColor(pct) }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name={onboarding.am_profile?.full_name ?? "Unassigned"} src={onboarding.am_profile?.avatar_url} size="sm" />
            <div className="leading-tight">
              <p className="text-[10px] text-slate-400">Account Manager</p>
              <p className="text-sm font-medium text-slate-700">{onboarding.am_profile?.full_name ?? "Unassigned"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
              tab === id ? "bg-[#1B3A6B] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100/80")}
          >
            <Icon size={14} /> {label}
            {count !== undefined && count > 0 && (
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", tab === id ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500")}>{count}</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {tab === "steps" && (
            <StepsTab
              onboarding={onboarding}
              steps={steps}
              profiles={profiles}
              onStepsChange={setSteps}
              onOnboardingChange={updateOnboarding}
              onDocAdded={(d) => setDocuments((prev) => [d, ...prev])}
            />
          )}
          {tab === "training" && (
            <TrainingTab onboarding={onboarding} sessions={training} profiles={profiles} onSessionsChange={setTraining} />
          )}
          {tab === "documents" && (
            <OnbDocumentsTab onboarding={onboarding} documents={documents} onDocumentsChange={setDocuments} />
          )}
          {tab === "activity" && (
            <OnbActivityTab onboarding={onboarding} steps={steps} training={training} documents={documents} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Send Portal Link modal */}
      <Modal isOpen={sendOpen} onClose={() => setSendOpen(false)} title="Send portal link to client" size="md">
        <div className="space-y-4">
          <Input label="To" type="email" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="client@company.ie" />
          <Input label="Subject" value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} />
          <Textarea label="Message" rows={9} value={sendBody} onChange={(e) => setSendBody(e.target.value)} />
          <p className="text-xs text-slate-400">Opens your email client with this message pre-filled (the portal link is included in the body).</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSendOpen(false)}>Cancel</Button>
            <Button onClick={sendLink} leftIcon={<Send size={15} />} disabled={!sendTo}>Send</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
