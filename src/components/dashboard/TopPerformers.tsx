'use client';

import { Trophy } from 'lucide-react';
import { formatEuroCompact, getInitials, getAvatarColor } from '@/lib/utils';
import type { TopPerformer } from '@/types/database';

interface TopPerformersProps {
  performers: TopPerformer[];
}

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#B45309'];
const RANK_LABELS = ['Gold', 'Silver', 'Bronze'];

export default function TopPerformers({ performers }: TopPerformersProps) {
  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">Top Performers</h2>
        <p className="text-xs text-slate-400 mt-0.5">Ranked by closed revenue</p>
      </div>

      {performers.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No data yet</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wide w-10">Rank</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wide">Name</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wide">Won</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wide">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {performers.map((p, i) => {
                const name = p.profile.full_name ?? p.profile.email;
                const initials = getInitials(name);
                const avatarBg = getAvatarColor(name);
                const rankColor = RANK_COLORS[i] ?? '#CBD5E1';

                return (
                  <tr
                    key={p.profile.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {i < 3 ? (
                        <Trophy
                          className="w-4 h-4"
                          style={{ color: rankColor }}
                          aria-label={RANK_LABELS[i]}
                        />
                      ) : (
                        <span className="text-xs text-slate-400 font-medium tabular-nums">#{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: avatarBg }}
                        >
                          {initials}
                        </div>
                        <span className="text-sm font-medium text-[#0F172A] truncate max-w-[120px]">{name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-[#059669] tabular-nums">{p.closed_won_count}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold text-[#1B3A6B] tabular-nums">{formatEuroCompact(p.revenue)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
