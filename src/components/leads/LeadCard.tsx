'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Phone, FileText, ExternalLink } from 'lucide-react'
import type { Lead } from '@/types/database'
import {
  formatEuro,
  formatDate,
  getInitials,
  getAvatarColor,
  getStagePillClass,
} from '@/lib/utils'
import { LeadScoreBadge } from './LeadScoreBadge'

interface LeadCardProps {
  lead: Lead
  onLogCall?: (lead: Lead) => void
  onAddNote?: (lead: Lead) => void
  isDragOverlay?: boolean
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

export function LeadCard({ lead, onLogCall, onAddNote, isDragOverlay = false }: LeadCardProps) {
  const [hovered, setHovered] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const assignedName = lead.assigned_profile?.full_name ?? null
  const avatarColor = getAvatarColor(assignedName)
  const initials = getInitials(assignedName)
  const overdue = isOverdue(lead.follow_up_date)

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        className={`relative glass-sm p-3 cursor-grab active:cursor-grabbing select-none ${isDragOverlay ? 'dragging' : ''}`}
        animate={{ scale: hovered && !isDragging ? 1.015 : 1 }}
        transition={{ duration: 0.15 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Stale badge */}
        {lead.is_stale && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
            Stale
          </span>
        )}

        {/* Company + contact */}
        <div className="pr-10">
          <p className="font-semibold text-sm text-gray-900 truncate leading-tight">
            {lead.company_name}
          </p>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {lead.contact_name}
          </p>
        </div>

        {/* Deal value + system size */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs font-semibold text-[#1B3A6B]">
            {formatEuro(lead.deal_value)}
          </span>
          {lead.system_size_kw != null && (
            <span className="text-xs text-gray-400">
              {lead.system_size_kw} kW
            </span>
          )}
        </div>

        {/* Bottom row: avatar + score + follow-up */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            {/* Avatar */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
              style={{ backgroundColor: avatarColor }}
              title={assignedName ?? 'Unassigned'}
            >
              {initials}
            </div>

            {/* Follow-up date */}
            {lead.follow_up_date && (
              <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                {overdue ? 'Overdue ' : ''}{formatDate(lead.follow_up_date)}
              </span>
            )}
          </div>

          <LeadScoreBadge score={lead.lead_score} />
        </div>

        {/* Stage pill */}
        <div className="mt-2">
          <span
            className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getStagePillClass(lead.stage)}`}
          >
            {lead.stage}
          </span>
        </div>

        {/* Quick action overlay on hover */}
        {hovered && !isDragging && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 rounded-xl flex items-center justify-center gap-2 bg-white/60 backdrop-blur-sm"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <button
              className="p-2 rounded-lg bg-white shadow-sm hover:bg-blue-50 border border-gray-200 transition-colors"
              title="Log Call"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onLogCall?.(lead)
              }}
            >
              <Phone size={14} className="text-gray-600" />
            </button>
            <button
              className="p-2 rounded-lg bg-white shadow-sm hover:bg-purple-50 border border-gray-200 transition-colors"
              title="Add Note"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onAddNote?.(lead)
              }}
            >
              <FileText size={14} className="text-gray-600" />
            </button>
            <Link
              href={`/leads/${lead.id}`}
              className="p-2 rounded-lg bg-white shadow-sm hover:bg-green-50 border border-gray-200 transition-colors"
              title="View Lead"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} className="text-gray-600" />
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
