'use client';

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Circle, Mail, Phone, Download, FileSignature, PlayCircle, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Onboarding, OnboardingStep, TrainingSession, OnboardingDocument } from "@/types/database";
import { onboardingProgress } from "@/lib/onboarding";
import { STEP_TYPE_ICON, progressColor, trainingTypeMeta } from "@/components/onboarding/helpers";
import { cn, formatDateTime, formatRelativeTime } from "@/lib/utils";
import SolarFlowLogo from "@/components/logo/SolarFlowLogo";
import Spinner from "@/components/ui/Spinner";
import toast from "react-hot-toast";

interface AM { full_name: string | null; email: string | null; avatar_initials: string | null; role_title: string | null }
interface Payload {
  onboarding: Onboarding;
  am: AM | null;
  steps: OnboardingStep[];
  training: TrainingSession[];
  documents: OnboardingDocument[];
}

export default function PortalClient({ token }: { token: string }) {
  const supabase = createClient();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const { data: payload, error } = await supabase.rpc("portal_get_onboarding", { p_token: token });
    if (error || !payload) { setNotFound(true); setLoading(false); return; }
    setData(payload as Payload);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
    supabase.rpc("portal_log_view", { p_token: token });
  }, [load, token]);

  const bookSlot = async (sessionId: string, slot: string) => {
    const { data: res, error } = await supabase.rpc("portal_book_slot", { p_token: token, p_session_id: sessionId, p_slot: slot });
    if (error || !(res as { ok?: boolean })?.ok) { toast.error("Couldn't book that slot"); return; }
    toast.success("Session booked — your team has been notified");
    load();
  };

  const signSla = async () => {
    if (!confirm("Confirm you've reviewed and agree to the Service Level Agreement?")) return;
    const { data: res, error } = await supabase.rpc("portal_sign_sla", { p_token: token });
    if (error || !(res as { ok?: boolean })?.ok) { toast.error("Something went wrong"); return; }
    toast.success("Thank you — SLA signed");
    load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (notFound || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <SolarFlowLogo size={36} />
      <h1 className="text-xl font-bold text-[#0F172A] mt-6">Portal link not found</h1>
      <p className="text-slate-500 mt-2">This onboarding link is invalid or has expired. Please contact your Account Manager.</p>
    </div>
  );

  const { onboarding: o, am, steps, training, documents } = data;
  const { pct } = onboardingProgress(steps);
  const firstPending = steps.findIndex((s) => s.status !== "completed" && s.status !== "skipped");
  const upcomingTraining = training.filter((t) => t.status === "scheduled" || t.status === "rescheduled");
  const completedTraining = training.filter((t) => t.status === "completed");

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <SolarFlowLogo size={30} />
        <span className="text-xs text-slate-400">Updated {formatRelativeTime(o.updated_at)}</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">Welcome to Solar Flow, {o.client_company_name}!</h1>
        <p className="text-slate-500 mt-1">Your onboarding is <span className="font-semibold" style={{ color: progressColor(pct) }}>{pct}% complete</span></p>
        <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden mt-4">
          <motion.div className="h-full rounded-full" style={{ backgroundColor: progressColor(pct) }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
        </div>

        {am && (
          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-white/60">
            <div className="w-12 h-12 rounded-full bg-[#1B3A6B] text-white flex items-center justify-center font-bold shrink-0">{am.avatar_initials ?? "AM"}</div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Your dedicated Account Manager</p>
              <p className="text-sm font-semibold text-[#0F172A]">{am.full_name ?? "Your Account Manager"}</p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                {am.email && <a href={`mailto:${am.email}`} className="inline-flex items-center gap-1 hover:text-[#1B3A6B]"><Mail size={12} /> {am.email}</a>}
                {o.client_contact_phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {o.client_contact_phone}</span>}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* SLA prompt */}
      {!o.sla_signed && (
        <div className="glass-card p-5 mb-6 border-l-4 border-amber-400">
          <div className="flex items-start gap-3">
            <FileSignature className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h2 className="text-sm font-bold text-[#0F172A]">Action needed: sign your Service Level Agreement</h2>
              <p className="text-sm text-slate-500 mt-0.5">Please review and sign the SLA to get your onboarding moving.</p>
            </div>
            <button onClick={signSla} className="px-4 py-2 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors shrink-0">Review &amp; Sign</button>
          </div>
        </div>
      )}

      {/* Progress tracker */}
      <Section title="Your onboarding journey">
        <div className="relative">
          {steps.map((step, i) => {
            const Icon = STEP_TYPE_ICON[step.step_type] ?? Circle;
            const done = step.status === "completed";
            const current = i === firstPending;
            const color = done ? "#059669" : current ? "#1B3A6B" : "#CBD5E1";
            return (
              <div key={step.id} className="relative pl-11 pb-5 last:pb-0">
                {i < steps.length - 1 && <div className="absolute left-[19px] top-9 bottom-0 w-px" style={{ background: done ? "#A7F3D0" : "#E2E8F0" }} />}
                <div className="absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center border-2"
                  style={{ borderColor: color, background: done ? "#ECFDF5" : current ? "#EFF6FF" : "#F8FAFC", color }}>
                  {done ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="check-draw" d="M20 6L9 17l-5-5" /></svg>
                  ) : current ? <ArrowRight size={16} /> : <Icon size={15} />}
                </div>
                <div className={cn("pt-1.5", current && "font-semibold")}>
                  <p className={cn("text-sm", done ? "text-slate-500" : current ? "text-[#1B3A6B]" : "text-slate-400")}>{step.title}</p>
                  <p className="text-[11px]" style={{ color }}>{done ? "Completed" : current ? "In progress" : "Upcoming"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Training */}
      {(upcomingTraining.length > 0 || completedTraining.length > 0) && (
        <Section title="Training sessions">
          <div className="space-y-3">
            {upcomingTraining.map((t) => (
              <div key={t.id} className="glass-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  {(() => { const TI = trainingTypeMeta(t.session_type).icon; const gold = trainingTypeMeta(t.session_type).gold; return <TI size={14} className={gold ? "text-amber-500" : "text-[#1B3A6B]"} />; })()}
                  <p className="text-sm font-semibold text-[#0F172A]">{t.title}</p>
                </div>
                {t.client_can_book && t.available_slots?.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 mb-2">Pick a time that suits you:</p>
                    <div className="flex flex-wrap gap-2">
                      {t.available_slots.map((slot) => (
                        <button key={slot} onClick={() => bookSlot(t.id, slot)} className="px-3 py-1.5 bg-white border border-[#1B3A6B]/30 text-[#1B3A6B] text-xs font-semibold rounded-lg hover:bg-[#1B3A6B] hover:text-white transition-colors">
                          {formatDateTime(slot)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : t.scheduled_date ? (
                  <p className="text-xs text-slate-500 inline-flex items-center gap-1"><CalendarClock size={12} /> {formatDateTime(t.scheduled_date)} · {t.duration_minutes} mins</p>
                ) : (
                  <p className="text-xs text-slate-400">Your team will confirm a time shortly.</p>
                )}
              </div>
            ))}
            {completedTraining.map((t) => (
              <div key={t.id} className="glass-sm p-4 opacity-80">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-600">{t.title}</p>
                  <span className="text-[11px] text-emerald-600 font-semibold">Completed</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  {t.scheduled_date && <span>{formatDateTime(t.scheduled_date)}</span>}
                  {t.recording_url && <a href={t.recording_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1B3A6B] hover:underline"><PlayCircle size={13} /> Watch recording</a>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <Section title="Your documents">
          <div className="space-y-2">
            {documents.map((d) => (
              <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer" className="glass-sm p-3 flex items-center gap-3 hover:bg-white/80 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#1B3A6B]/10 text-[#1B3A6B] flex items-center justify-center shrink-0"><Download size={16} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F172A] truncate">{d.title}</p>
                  <span className="text-[11px] text-slate-400 capitalize">{d.document_type.replace("_", " ")}</span>
                </div>
                <Download size={15} className="text-slate-400" />
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Contact */}
      {am?.email && (
        <Section title="Need help?">
          <div className="glass-sm p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">{am.full_name ?? "Your Account Manager"}</p>
              <p className="text-xs text-slate-500">{am.role_title ?? "Account Manager"} · Solar Flow</p>
            </div>
            <a href={`mailto:${am.email}`} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors">
              <Mail size={15} /> Send a message
            </a>
          </div>
        </Section>
      )}

      <p className="text-center text-xs text-slate-400 mt-10">Powered by Solar Flow · Last updated {formatRelativeTime(o.updated_at)}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </motion.section>
  );
}
