'use client';

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import type { Onboarding, Profile, TrainingSession, TrainingSessionType } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/onboarding";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onboarding: Onboarding;
  profiles: Profile[];
  onSaved: (s: TrainingSession) => void;
  session?: TrainingSession | null; // when set, edit/schedule this existing session
}

// ISO → value for <input type="datetime-local">
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TYPE_OPTIONS = [
  { value: "online", label: "Online" },
  { value: "in_person", label: "In Person" },
  { value: "full_day_onsite", label: "Full Day On-Site" },
];

export default function ScheduleSessionModal({ isOpen, onClose, onboarding, profiles, onSaved, session }: Props) {
  const supabase = createClient();
  const depts = onboarding.departments?.length ? onboarding.departments : ["Admin", "Sales", "Operations", "Installation"];
  const editing = !!session;

  const [department, setDepartment] = useState(depts[0]);
  const [type, setType] = useState<TrainingSessionType>("online");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState(45);
  const [trainer, setTrainer] = useState("");
  const [link, setLink] = useState("");
  const [attendees, setAttendees] = useState("");
  const [clientCanBook, setClientCanBook] = useState(false);
  const [slots, setSlots] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  // Pre-fill when (re)opening — from the session being scheduled, or sensible defaults.
  useEffect(() => {
    if (!isOpen) return;
    if (session) {
      setDepartment(session.department ?? depts[0]);
      setType(session.session_type);
      setDate(toLocalInput(session.scheduled_date));
      setDuration(session.duration_minutes ?? (session.session_type === "online" ? 45 : 480));
      setTrainer(session.trainer ?? "");
      setLink(session.location_or_link ?? "");
      setAttendees(session.attendees ?? "");
      setClientCanBook(session.client_can_book ?? false);
      setSlots(session.available_slots?.length ? session.available_slots.map(toLocalInput) : [""]);
    } else {
      setDepartment(depts[0]); setType("online"); setDate(""); setDuration(45);
      setTrainer(""); setLink(""); setAttendees(""); setClientCanBook(false); setSlots([""]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, session]);

  const setSlot = (i: number, v: string) => setSlots((s) => s.map((x, idx) => (idx === i ? v : x)));
  const addSlot = () => setSlots((s) => (s.length < 5 ? [...s, ""] : s));
  const removeSlot = (i: number) => setSlots((s) => s.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!clientCanBook && !date) { toast.error("Pick a date or enable client booking"); return; }
    const cleanSlots = slots.map((s) => s.trim()).filter(Boolean).map((s) => new Date(s).toISOString());
    if (clientCanBook && cleanSlots.length === 0) { toast.error("Add at least one available slot"); return; }
    setSaving(true);

    const payload = {
      department,
      session_type: type,
      scheduled_date: clientCanBook ? null : new Date(date).toISOString(),
      duration_minutes: duration,
      location_or_link: link || null,
      trainer: trainer || null,
      attendees: attendees || null,
      status: "scheduled" as const,
      client_can_book: clientCanBook,
      available_slots: clientCanBook ? cleanSlots : [],
    };

    let data: TrainingSession | null = null;
    let error: { message: string } | null = null;
    if (editing && session) {
      const res = await supabase.from("training_sessions").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", session.id).select("*, trainer_profile:profiles!trainer(id,full_name,avatar_initials)").single<TrainingSession>();
      data = res.data; error = res.error;
    } else {
      const res = await supabase.from("training_sessions").insert({ ...payload, onboarding_id: onboarding.id, title: `${department} Team Training` }).select("*, trainer_profile:profiles!trainer(id,full_name,avatar_initials)").single<TrainingSession>();
      data = res.data; error = res.error;
    }
    setSaving(false);
    if (error || !data) { toast.error(error?.message.includes("does not exist") ? "Run the onboarding SQL migration first" : "Failed to schedule"); return; }

    // notify trainer + AM
    const { data: { user } } = await supabase.auth.getUser();
    for (const uid of [trainer, onboarding.assigned_am]) {
      if (uid && uid !== user?.id) {
        await notify(supabase, { user_id: uid, type: "training_scheduled", title: "Training session scheduled", message: `${data.title} for ${onboarding.client_company_name}`, lead_id: onboarding.lead_id });
      }
    }
    onSaved(data);
    toast.success(clientCanBook ? "Slots offered to client" : "Training session scheduled");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? `Schedule: ${session?.title}` : "Schedule Training Session"} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Department" options={depts.map((d) => ({ value: d, label: d }))} value={department} onChange={(e) => setDepartment(e.target.value)} />
          <Select label="Session Type" options={TYPE_OPTIONS} value={type} onChange={(e) => setType(e.target.value as TrainingSessionType)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Trainer" placeholder="Select trainer…" options={profiles.map((p) => ({ value: p.id, label: p.full_name ?? p.email }))} value={trainer} onChange={(e) => setTrainer(e.target.value)} />
          <Input label="Duration (mins)" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value) || 45)} />
        </div>
        <Input label={type === "online" ? "Meeting link" : "Address"} value={link} onChange={(e) => setLink(e.target.value)} placeholder={type === "online" ? "https://zoom.us/j/…" : "Client premises address"} />
        <Input label="Attendees (comma separated emails)" value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="a@co.ie, b@co.ie" />

        <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-white/70">
          <span className="text-sm font-medium text-slate-700">Let client pick from available slots</span>
          <Toggle checked={clientCanBook} onChange={setClientCanBook} />
        </div>

        {clientCanBook ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Offer up to 5 time slots for the client to choose from.</p>
            {slots.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="datetime-local" value={s} onChange={(e) => setSlot(i, e.target.value)} className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20" />
                {slots.length > 1 && <button onClick={() => removeSlot(i)} className="p-1.5 text-slate-400 hover:text-red-500"><X size={15} /></button>}
              </div>
            ))}
            {slots.length < 5 && <button onClick={addSlot} className="flex items-center gap-1 text-xs font-medium text-[#1B3A6B] hover:underline"><Plus size={13} /> Add slot</button>}
          </div>
        ) : (
          <Input label="Date & time" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{editing ? "Save" : "Schedule"}</Button>
        </div>
      </div>
    </Modal>
  );
}
