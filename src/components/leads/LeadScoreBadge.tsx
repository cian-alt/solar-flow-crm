'use client'

import { getScoreBadgeClass } from '@/lib/utils'

interface LeadScoreBadgeProps {
  score: number
  size?: 'sm' | 'md'
}

export function LeadScoreBadge({ score, size = 'sm' }: LeadScoreBadgeProps) {
  const badgeClass = getScoreBadgeClass(score)
  const sizeClass = size === 'sm'
    ? 'w-7 h-7 text-xs'
    : 'w-8 h-8 text-sm'

  return (
    <div className="relative group">
      <div
        className={`${badgeClass} ${sizeClass} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
        aria-label={`Lead score: ${score}/100`}
      >
        {score}
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        Lead Score: {score}/100
      </div>
    </div>
  )
}
