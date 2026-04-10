'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import type { Lead, LeadStage } from '@/types/database'
import { formatEuro, STAGE_COLORS } from '@/lib/utils'
import { LeadCard } from './LeadCard'

interface KanbanColumnProps {
  stage: LeadStage
  leads: Lead[]
  onAddLead?: (stage: LeadStage) => void
  onLogCall?: (lead: Lead) => void
  onAddNote?: (lead: Lead) => void
}

export function KanbanColumn({
  stage,
  leads,
  onAddLead,
  onLogCall,
  onAddNote,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  const stageColor = STAGE_COLORS[stage]
  const totalValue = leads.reduce((sum, l) => sum + (l.deal_value ?? 0), 0)

  return (
    <div
      className="flex-shrink-0 flex flex-col"
      style={{ width: 280 }}
    >
      {/* Column header */}
      <div
        className="glass-sm px-3 py-2.5 mb-2 flex items-center justify-between"
        style={{ borderTop: `3px solid ${stageColor.text}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: stageColor.text }}
          />
          <span className="text-sm font-semibold text-gray-800 truncate">
            {stage}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Pipeline value */}
      {totalValue > 0 && (
        <div className="px-1 mb-2">
          <span className="text-xs text-gray-400">
            {formatEuro(totalValue)} pipeline
          </span>
        </div>
      )}

      {/* Drop zone + cards */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl min-h-[calc(100vh-280px)] transition-colors duration-150 overflow-y-auto p-1 space-y-2 ${
          isOver
            ? 'bg-blue-50/60 ring-2 ring-blue-300 ring-inset'
            : 'bg-white/20'
        }`}
      >
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onLogCall={onLogCall}
              onAddNote={onAddNote}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3 opacity-40"
              style={{ backgroundColor: stageColor.bg }}
            >
              <span style={{ color: stageColor.text, fontSize: 18 }}>—</span>
            </div>
            <p className="text-xs text-gray-400">No leads in this stage</p>
          </div>
        )}
      </div>

      {/* Add card button */}
      <button
        className="mt-2 w-full py-1.5 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
        onClick={() => onAddLead?.(stage)}
      >
        <Plus size={12} />
        Add lead
      </button>
    </div>
  )
}
