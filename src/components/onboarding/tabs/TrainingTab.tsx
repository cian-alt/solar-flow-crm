'use client';

import { useState } from "react";
import { Plus, Clock, CalendarClock, CalendarPlus } from "lucide-react";
import type { Onboarding, TrainingSession, Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { TRAINING_STATUS_META, departmentColor, trainingTypeMeta } from "../helpers";
import { cn, formatDateTime } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import ScheduleSessionModal from "../ScheduleSessionModal";
import toast from "react-hot-toast";

interface Props {
  onboarding: Onboarding;
  sessions: TrainingSession[];
  profiles: Profile[];
  onSessionsChange: (s: TrainingSession[]) => void;
}

export default function TrainingTab({ onboarding, sessions, profiles, onSessionsChange }: Props) {
  const supabase = createClient();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);

  const patch = async (id: string, updates: Partial<TrainingSession>) => {
    onSessionsChange(sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    await supabase.from("training_sessions").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  };

  const upsert = (saved: TrainingSession) => {
    onSessionsChange(sessions.some((s) => s.id === saved.id) ? sessions.map((s) => (s.id === saved.id ? saved : s)) : [...sessions, saved]);
  };

  const openSchedule = (session: TrainingSession | null) => { setEditingSession(session); setScheduleOpen(true); };

  // group by department
  const groups = sessions.reduce<Record<string, TrainingSession[]>>((acc, s) => {
    const key = s.department ?? "All Teams";
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => openSchedule(null)} className="flex items-center gap-1.5 px-4 py-2 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors">
          <Plus size={16} /> Schedule Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No training sessions yet" description="Schedule the first session for this client." action={{ label: "Schedule Session", onClick: () => openSchedule(null) }} />
      ) : (
        Object.entries(groups).map(([dept, list]) => (
          <div key={dept}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: departmentColor(dept) }} />
              <h3 className="text-sm font-bold text-[#0F172A]">{dept}</h3>
              <span className="text-xs text-slate-400">{list.length} session{list.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
              {list.map((s) => {
                const statusMeta = TRAINING_STATUS_META[s.status];
                const typeMeta = trainingTypeMeta(s.session_type);
                const TypeIcon = typeMeta.icon;
                const trainerName = s.trainer_profile?.full_name ?? profiles.find((p) => p.id === s.trainer)?.full_name;
                return (
                  <div
                    key={s.id}
                    className={cn("glass-sm p-4 space-y-2.5", typeMeta.gold && "ring-1 ring-amber-300")}
                    style={{ borderLeft: `3px solid ${typeMeta.gold ? "#D4A017" : departmentColor(dept)}` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A] truncate">{s.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                          <TypeIcon size={12} className={typeMeta.gold ? "text-amber-500" : undefined} />
                          <span>{typeMeta.label}</span>
                          <span className="inline-flex items-center gap-0.5"><Clock size={11} /> {s.duration_minutes}m</span>
                        </div>
                      </div>
                      {typeMeta.gold ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wide shrink-0">★ On-Site</span>
                      ) : s.client_can_book ? (
                        <Badge variant="warning">Pending Client Booking</Badge>
                      ) : (
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      )}
                    </div>

                    <div className="text-xs text-slate-600">
                      {s.scheduled_date ? formatDateTime(s.scheduled_date) : s.client_can_book ? `${s.available_slots?.length ?? 0} slots offered to client` : "Not scheduled"}
                      {trainerName && <span className="text-slate-400"> · {trainerName}</span>}
                    </div>

                    {s.location_or_link && (
                      <a href={s.session_type === "online" ? s.location_or_link : undefined} target="_blank" rel="noreferrer" className="text-xs text-[#1B3A6B] truncate block hover:underline">{s.location_or_link}</a>
                    )}

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <button onClick={() => openSchedule(s)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1B3A6B] text-white text-[11px] font-semibold rounded-lg hover:bg-[#152E55]">
                        <CalendarPlus size={12} /> {s.scheduled_date || s.client_can_book ? "Reschedule" : "Schedule"}
                      </button>
                      {s.status !== "completed" && (
                        <button onClick={() => patch(s.id, { status: "completed" })} className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-700">Mark Completed</button>
                      )}
                      {s.status !== "cancelled" && s.status !== "completed" && (
                        <button onClick={() => patch(s.id, { status: "cancelled" })} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-500 text-[11px] font-medium rounded-lg hover:bg-slate-50">Cancel</button>
                      )}
                      {s.status === "completed" && (
                        <button
                          onClick={() => { const url = window.prompt("Recording URL", s.recording_url ?? ""); if (url !== null) { patch(s.id, { recording_url: url || null }); toast.success("Recording saved"); } }}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[11px] font-medium rounded-lg hover:bg-slate-50"
                        >
                          {s.recording_url ? "Edit Recording" : "Add Recording"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <ScheduleSessionModal
        isOpen={scheduleOpen}
        onClose={() => { setScheduleOpen(false); setEditingSession(null); }}
        onboarding={onboarding}
        profiles={profiles}
        session={editingSession}
        onSaved={upsert}
      />
    </div>
  );
}
