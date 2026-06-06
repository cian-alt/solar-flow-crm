'use client';

import { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, ChevronDown, Check, Plus, Upload, AlertCircle } from "lucide-react";
import type { Onboarding, OnboardingStep, Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { isStepOverdue, notify } from "@/lib/onboarding";
import { STEP_TYPE_ICON } from "../helpers";
import { cn, formatDate } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";

interface Props {
  onboarding: Onboarding;
  steps: OnboardingStep[];
  profiles: Profile[];
  onStepsChange: (s: OnboardingStep[]) => void;
  onOnboardingChange: (u: Partial<Onboarding>) => void;
  onDocAdded: (d: import("@/types/database").OnboardingDocument) => void;
}

export default function StepsTab({ onboarding, steps, profiles, onStepsChange, onOnboardingChange, onDocAdded }: Props) {
  const supabase = createClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const patchStep = async (id: string, updates: Partial<OnboardingStep>) => {
    onStepsChange(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    await supabase.from("onboarding_steps").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  };

  const completeStep = async (step: OnboardingStep) => {
    const { data: { user } } = await supabase.auth.getUser();
    const updates: Partial<OnboardingStep> = { status: "completed", completed_at: new Date().toISOString(), completed_by: user?.id ?? null };
    await patchStep(step.id, updates);

    if (onboarding.status === "not_started") onOnboardingChange({ status: "in_progress" });
    if (onboarding.assigned_am && onboarding.assigned_am !== user?.id) {
      await notify(supabase, { user_id: onboarding.assigned_am, type: "onboarding_step_complete", title: "Onboarding step completed", message: `"${step.title}" completed for ${onboarding.client_company_name}`, lead_id: onboarding.lead_id });
    }
    if (step.step_type === "go_live") {
      onOnboardingChange({ status: "completed" });
      confetti({ particleCount: 160, spread: 75, origin: { y: 0.5 }, colors: ["#1B3A6B", "#059669", "#F59E0B"] });
      toast.success(`🚀 ${onboarding.client_company_name} is live on Solar Flow!`);
      if (onboarding.assigned_am) {
        await notify(supabase, { user_id: onboarding.assigned_am, type: "onboarding_go_live", title: "Client went live! 🚀", message: `${onboarding.client_company_name} is now live on Solar Flow`, lead_id: onboarding.lead_id });
      }
    } else {
      toast.success("Step completed");
    }
  };

  const reopenStep = (step: OnboardingStep) => patchStep(step.id, { status: "pending", completed_at: null, completed_by: null });
  const skipStep = (step: OnboardingStep) => patchStep(step.id, { status: "skipped" });

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = steps.findIndex((s) => s.id === active.id);
    const newIdx = steps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(steps, oldIdx, newIdx).map((s, i) => ({ ...s, order_index: i }));
    onStepsChange(reordered);
    await Promise.all(reordered.map((s) => supabase.from("onboarding_steps").update({ order_index: s.order_index }).eq("id", s.id)));
  };

  const addCustomStep = async () => {
    const title = window.prompt("Custom step title");
    if (!title?.trim()) return;
    const order_index = steps.length;
    const { data, error } = await supabase.from("onboarding_steps").insert({
      onboarding_id: onboarding.id, step_type: "custom", title: title.trim(), status: "pending", order_index,
    }).select("*").single<OnboardingStep>();
    if (error || !data) { toast.error("Failed to add step"); return; }
    onStepsChange([...steps, data]);
  };

  const uploadDoc = async (step: OnboardingStep, file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    const path = `onboarding/${onboarding.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) { toast.error("Upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
    const { data, error } = await supabase.from("onboarding_documents").insert({
      onboarding_id: onboarding.id, document_type: "other", title: file.name, file_url: publicUrl, uploaded_by: user?.id ?? null, visible_to_client: true,
    }).select("*, uploader:profiles!uploaded_by(id,full_name,avatar_initials)").single();
    if (error || !data) { toast.error("Failed to save document"); return; }
    onDocAdded(data as import("@/types/database").OnboardingDocument);
    toast.success(`Attached ${file.name} to ${step.title}`);
  };

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="relative">
            {steps.map((step, i) => (
              <SortableStep
                key={step.id}
                step={step}
                index={i}
                isLast={i === steps.length - 1}
                expanded={expanded === step.id}
                profiles={profiles}
                onToggle={() => setExpanded(expanded === step.id ? null : step.id)}
                onComplete={() => completeStep(step)}
                onReopen={() => reopenStep(step)}
                onSkip={() => skipStep(step)}
                onAssign={(id) => patchStep(step.id, { assigned_to: id || null })}
                onDue={(d) => patchStep(step.id, { due_date: d || null })}
                onUpload={(f) => uploadDoc(step, f)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button onClick={addCustomStep} className="flex items-center gap-1.5 px-4 py-2 bg-white/60 border border-white/80 text-slate-600 text-sm font-medium rounded-xl hover:bg-white/80 transition-colors">
        <Plus size={15} /> Add Custom Step
      </button>
    </div>
  );
}

function SortableStep({
  step, index, isLast, expanded, profiles, onToggle, onComplete, onReopen, onSkip, onAssign, onDue, onUpload,
}: {
  step: OnboardingStep; index: number; isLast: boolean; expanded: boolean; profiles: Profile[];
  onToggle: () => void; onComplete: () => void; onReopen: () => void; onSkip: () => void;
  onAssign: (id: string) => void; onDue: (d: string) => void; onUpload: (f: File) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined };
  const Icon = STEP_TYPE_ICON[step.step_type] ?? STEP_TYPE_ICON.custom;
  const done = step.status === "completed";
  const skipped = step.status === "skipped";
  const overdue = isStepOverdue(step);
  const daysOverdue = overdue && step.due_date ? Math.floor((Date.now() - new Date(step.due_date).getTime()) / 86400000) : 0;
  const assignee = profiles.find((p) => p.id === step.assigned_to);

  return (
    <div ref={setNodeRef} style={style} className="relative pl-10">
      {/* Connecting line */}
      {!isLast && <div className="absolute left-[18px] top-9 bottom-0 w-px bg-slate-200" aria-hidden />}
      {/* Node icon */}
      <div className={cn("absolute left-0 top-1.5 w-9 h-9 rounded-full flex items-center justify-center border-2",
        done ? "bg-emerald-50 border-emerald-500 text-emerald-600" : skipped ? "bg-slate-50 border-slate-300 text-slate-400" : overdue ? "bg-red-50 border-red-400 text-red-500" : "bg-white border-slate-300 text-slate-500")}>
        {done ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path className="check-draw" d="M20 6L9 17l-5-5" />
          </svg>
        ) : <Icon size={15} />}
      </div>

      <div className={cn("glass-sm p-3 mb-3", done && "opacity-80")}>
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-500 touch-none" aria-label="Drag to reorder">
            <GripVertical size={15} />
          </button>
          <button onClick={onToggle} className="flex-1 flex items-center gap-2 text-left min-w-0">
            <span className="text-[11px] font-bold text-slate-400 w-5">{index + 1}</span>
            <span className={cn("text-sm font-medium truncate", done ? "text-slate-500 line-through" : "text-[#0F172A]")}>{step.title}</span>
            {step.department && <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full shrink-0">{step.department}</span>}
          </button>
          <span className={cn("text-[11px] shrink-0 flex items-center gap-1", overdue ? "text-red-600 font-semibold" : "text-slate-400")}>
            {overdue && <AlertCircle size={11} />}{formatDate(step.due_date)}
            {overdue && <span>· {daysOverdue}d overdue</span>}
          </span>
          {assignee && <Avatar name={assignee.full_name} size="sm" />}
          <ChevronDown size={15} className={cn("text-slate-400 transition-transform shrink-0", expanded && "rotate-180")} />
        </div>

        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 border-t border-white/60 space-y-3 overflow-hidden">
            {step.description && <p className="text-sm text-slate-600">{step.description}</p>}
            {done && step.completed_at && (
              <p className="text-xs text-emerald-600">✓ Completed {formatDate(step.completed_at)}{step.completer?.full_name ? ` by ${step.completer.full_name}` : ""}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Assigned to</label>
                <select value={step.assigned_to ?? ""} onChange={(e) => onAssign(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20">
                  <option value="">Unassigned</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Due date</label>
                <input type="date" value={step.due_date ?? ""} onChange={(e) => onDue(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20" />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!done ? (
                <button onClick={onComplete} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                  <Check size={14} /> Mark Complete
                </button>
              ) : (
                <button onClick={onReopen} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors">Reopen</button>
              )}
              {!done && !skipped && (
                <button onClick={onSkip} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors">Skip</button>
              )}
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                <Upload size={14} /> Upload Document
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
              </label>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
