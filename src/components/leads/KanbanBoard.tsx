'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Lead, LeadStage } from '@/types/database';
import { KanbanColumn } from './KanbanColumn';
import { LeadCard } from './LeadCard';
import { STAGE_ORDER } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface KanbanBoardProps {
  leads: Lead[];
  onLeadsChange: (leads: Lead[]) => void;
}

export default function KanbanBoard({ leads, onLeadsChange }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeLead = leads.find(l => l.id === activeId) ?? null;

  const leadsPerStage = STAGE_ORDER.reduce<Record<LeadStage, Lead[]>>((acc, stage) => {
    acc[stage] = leads.filter(l => l.stage === stage);
    return acc;
  }, {} as Record<LeadStage, Lead[]>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Determine target stage — over.id could be a stage name or another lead id
    let newStage: LeadStage;
    if (STAGE_ORDER.includes(over.id as LeadStage)) {
      newStage = over.id as LeadStage;
    } else {
      // over is another lead — find its stage
      const overLead = leads.find(l => l.id === String(over.id));
      if (!overLead) return;
      newStage = overLead.stage;
    }

    if (newStage === lead.stage) return;

    const oldStage = lead.stage;

    // Optimistic update
    onLeadsChange(leads.map(l => l.id === leadId ? { ...l, stage: newStage } : l));

    // Persist
    const { error } = await supabase
      .from('leads')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', leadId);

    if (error) {
      // Revert
      onLeadsChange(leads.map(l => l.id === leadId ? { ...l, stage: oldStage } : l));
      toast.error('Failed to update stage');
      return;
    }

    // Log activity
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('activities').insert({
        lead_id: leadId,
        user_id: user.id,
        type: 'stage_change',
        description: `Stage changed from "${oldStage}" to "${newStage}"`,
        metadata: { from: oldStage, to: newStage },
      });

      // Notify assigned user on stage change
      if (lead.assigned_to && lead.assigned_to !== user.id) {
        await supabase.from('notifications').insert({
          user_id: lead.assigned_to,
          type: 'stage_change',
          title: 'Lead Stage Updated',
          message: `${lead.company_name} moved to "${newStage}"`,
          lead_id: leadId,
        });
      }

      // Trigger confetti for Closed Won (handled in lead detail, but toast here)
      if (newStage === 'Closed Won') {
        toast.success(`🎉 ${lead.company_name} — Closed Won!`);
      }
    }

    toast.success(`Moved to ${newStage}`);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STAGE_ORDER.map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              leads={leadsPerStage[stage] ?? []}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeLead ? (
          <LeadCard lead={activeLead} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
