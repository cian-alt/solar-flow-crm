'use client';

import { useState } from "react";
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
  onScheduled: (s: TrainingSession) => void;
}

export default function ScheduleSessionModal({ isOpen, onClose, onboarding, profiles, onScheduled }: Props) {
  const supabase = createClient();
  const depts = onboarding.departments?.length ? onboarding.departments : ["Admin", "Sales", "Operations", "Wiring"];
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

  const setSlot = (i: number, v: string) => setSlots((s) => s.map((x, idx) => (idx === i ? v : x)));
  const addSlot = () => setSlots((s) => (s.length < 5 ? [...s, ""] : s));
  const removeSlot = (i: number) => setSlots((s) => s.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!clientCanBook && !date) { toast.error("Pick a date or enable client booking"); return; }
    const cleanSlots = slots.map((s) => s.trim()).filter(Boolean).map((s) => new Date(s).toISOString());
    if (clientCanBook && cleanSlots.length === 0) { toast.error("Add at least one available slot"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("training_sessions").insert({
      onboarding_id: onboarding.id,
      department,
      session_type: type,
      title: `${department} Team Training`,
      scheduled_date: clientCanBook ? null : new Date(date).toISOString(),
      duration_minutes: duration,
      location_or_link: link || null,
      trainer: trainer || null,
      attendees: attendees || null,
      status: "scheduled",
      client_can_book: clientCanBook,
      available_slots: clientCanBook ? cleanSlots : [],
    }).select("*, trainer_profile:profiles!trainer(id,full_name,avatar_initials)").single<TrainingSession>();
    setSaving(false);
    if (error || !data) { toast.error(error?.message.includes("does not exist") ? "Run the onboarding SQL migration first" : "Failed to schedule"); return; }

    // notify trainer + AM
    const { data: { user } } = await supabase.auth.getUser();
    for (const uid of [trainer, onboarding.assigned_am]) {
      if (uid && uid !== user?.id) {
        await notify(supabase, { user_id: uid, type: "training_scheduled", title: "Training session scheduled", message: `${department} training for ${onboarding.client_company_name}`, lead_id: onboarding.lead_id });
      }
    }
    onScheduled(data);
    toast.success("Training session scheduled");
    onClose();
    setDate(""); setLink(""); setAttendees(""); setClientCanBook(false); setSlots([""]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Training Session" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Department" options={depts.map((d) => ({ value: d, label: d }))} value={department} onChange={(e) => setDepartment(e.target.value)} />
          <Select label="Session Type" options={[{ value: "online", label: "Online" }, { value: "in_person", label: "In Person" }]} value={type} onChange={(e) => setType(e.target.value as TrainingSessionType)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Trainer" placeholder="Select trainer…" options={profiles.map((p) => ({ value: p.id, label: p.full_name ?? p.email }))} value={trainer} onChange={(e) => setTrainer(e.target.value)} />
          <Input label="Duration (mins)" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value) || 45)} />
        </div>
        <Input label={type === "in_person" ? "Address" : "Meeting link"} value={link} onChange={(e) => setLink(e.target.value)} placeholder={type === "in_person" ? "Client premises address" : "https://zoom.us/j/…"} />
        <Input label="Attendees (comma separated emails)" value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="a@co.ie, b@co.ie" />

        <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-white/70">
          <span className="text-sm font-medium text-slate-700">Let client book from available slots</span>
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
          <Button onClick={submit} loading={saving}>Schedule</Button>
        </div>
      </div>
    </Modal>
  );
}
