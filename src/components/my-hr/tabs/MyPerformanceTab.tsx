'use client';

import { useState } from 'react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { PerformanceReview } from '@/types/database';

interface Props {
  reviews: PerformanceReview[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={16}
          fill={n <= rating ? '#F59E0B' : 'none'}
          color={n <= rating ? '#F59E0B' : '#CBD5E1'} />
      ))}
    </div>
  );
}

export default function MyPerformanceTab({ reviews }: Props) {
  const [expanded, setExpanded] = useState<string | null>(reviews[0]?.id ?? null);

  if (reviews.length === 0) {
    return (
      <div className="glass-card p-16 flex flex-col items-center gap-3 text-center">
        <Star className="w-8 h-8 text-slate-300" />
        <p className="font-semibold text-slate-600">No reviews shared yet</p>
        <p className="text-sm text-slate-400">Your manager will share performance reviews here when ready.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Performance Reviews</p>
      {reviews.map(review => {
        const reviewer = review.reviewer as { id: string; full_name: string | null } | undefined;
        const isExpanded = expanded === review.id;
        return (
          <div key={review.id} className="glass-card overflow-hidden">
            <button
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/40 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : review.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0F172A] mb-1">{review.review_period}</p>
                <div className="flex items-center gap-3">
                  <StarRating rating={review.rating} />
                  <span className="text-xs text-slate-400">
                    {reviewer?.full_name ?? 'Manager'} · {formatDate(review.created_at)}
                  </span>
                </div>
              </div>
              {isExpanded
                ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
                : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                {review.strengths && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Strengths</p>
                    <p className="text-sm text-slate-700">{review.strengths}</p>
                  </div>
                )}
                {review.improvements && (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Areas for Improvement</p>
                    <p className="text-sm text-slate-700">{review.improvements}</p>
                  </div>
                )}
                {review.goals && (
                  <div>
                    <p className="text-xs font-semibold text-[#1B3A6B] uppercase tracking-wide mb-1">Goals</p>
                    <p className="text-sm text-slate-700">{review.goals}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
