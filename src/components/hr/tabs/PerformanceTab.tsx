'use client';

import { useState } from 'react';
import { Star, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type { Profile, PerformanceReview } from '@/types/database';

interface Props {
  profile: Profile;
  reviews: PerformanceReview[];
}

function StarRating({ rating, onRate }: { rating: number; onRate?: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onRate?.(n)}
          className={`transition-colors ${onRate ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}>
          <Star size={16} fill={n <= rating ? '#F59E0B' : 'none'} color={n <= rating ? '#F59E0B' : '#CBD5E1'} />
        </button>
      ))}
    </div>
  );
}

interface NewReviewForm {
  review_period: string;
  rating: number;
  strengths: string;
  improvements: string;
  goals: string;
  share: boolean;
}

export default function PerformanceTab({ profile, reviews: initial }: Props) {
  const [reviews, setReviews] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState<NewReviewForm>({
    review_period: '', rating: 3, strengths: '', improvements: '', goals: '', share: false,
  });

  const supabase = createClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async () => {
    if (!form.review_period) return;
    setSaving(true);
    const { data: me } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('performance_reviews').insert({
      employee_id: profile.id,
      reviewer_id: me.user?.id ?? profile.id,
      review_period: form.review_period,
      rating: form.rating,
      strengths: form.strengths || null,
      improvements: form.improvements || null,
      goals: form.goals || null,
      status: form.share ? 'shared' : 'draft',
    }).select('*, reviewer:profiles!reviewer_id(id,full_name,avatar_initials)').maybeSingle();

    if (!error && data) {
      setReviews(prev => [data as PerformanceReview, ...prev]);
      if (form.share) {
        await supabase.from('notifications').insert({
          user_id: profile.id,
          type: 'review_shared',
          title: 'Performance review shared',
          message: `A performance review for ${form.review_period} has been shared with you.`,
        });
      }
    }
    setForm({ review_period: '', rating: 3, strengths: '', improvements: '', goals: '', share: false });
    setShowNew(false);
    setSaving(false);
  };

  const toggleShare = async (id: string, currentStatus: string, employeeId: string) => {
    const newStatus = currentStatus === 'shared' ? 'draft' : 'shared';
    await supabase.from('performance_reviews').update({ status: newStatus }).eq('id', id);
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as 'draft' | 'shared' } : r));
    if (newStatus === 'shared') {
      await supabase.from('notifications').insert({
        user_id: employeeId,
        type: 'review_shared',
        title: 'Performance review shared',
        message: 'A performance review has been shared with you.',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* New Review Button */}
      <div className="flex justify-end">
        <button onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#1B3A6B] rounded-xl hover:bg-[#1B3A6B]/90 transition-colors">
          <Plus size={14} /> New Review
        </button>
      </div>

      {/* New Review Form */}
      {showNew && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#0F172A]">New Performance Review</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Review Period</label>
              <input type="text" name="review_period" value={form.review_period} onChange={handleChange}
                placeholder="e.g. Q1 2026, H1 2026"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white/70 px-3 text-sm focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Overall Rating</label>
              <div className="flex items-center gap-3 h-10">
                <StarRating rating={form.rating} onRate={n => setForm(p => ({ ...p, rating: n }))} />
                <span className="text-sm text-slate-500">{form.rating}/5</span>
              </div>
            </div>
          </div>
          {[
            { name: 'strengths', label: 'Strengths', placeholder: 'What went well this period...' },
            { name: 'improvements', label: 'Areas for Improvement', placeholder: 'What could be better...' },
            { name: 'goals', label: 'Goals for Next Period', placeholder: 'Key objectives going forward...' },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">{label}</label>
              <textarea name={name} value={(form as unknown as Record<string, string>)[name]} onChange={handleChange}
                placeholder={placeholder} rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm resize-none focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 focus:outline-none" />
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="share" checked={form.share} onChange={handleChange}
              className="rounded border-slate-300 text-[#1B3A6B]" />
            <span className="text-sm text-slate-600">Share with employee immediately</span>
          </label>
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !form.review_period}
              className="px-5 py-1.5 text-sm font-semibold text-white bg-[#1B3A6B] rounded-xl hover:bg-[#1B3A6B]/90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Review'}
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center gap-3 text-center">
          <Star className="w-8 h-8 text-slate-300" />
          <p className="font-semibold text-slate-600">No reviews yet</p>
          <p className="text-sm text-slate-400">Create the first performance review above.</p>
        </div>
      ) : (
        <div className="space-y-3">
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
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#0F172A]">{review.review_period}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${review.status === 'shared' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {review.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StarRating rating={review.rating} />
                      <span className="text-xs text-slate-400">By {reviewer?.full_name ?? 'Admin'} · {formatDate(review.created_at)}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
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
                    <div className="flex items-center gap-3 pt-1">
                      <button onClick={() => toggleShare(review.id, review.status, profile.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          review.status === 'shared'
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}>
                        {review.status === 'shared' ? 'Unshare' : 'Share with Employee'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
