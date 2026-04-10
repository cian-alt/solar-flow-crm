'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { formatRelativeTime, getStagePillClass } from '@/lib/utils';
import type { Lead } from '@/types/database';

interface FollowUpsTodayProps {
  leads: Lead[];
}

export default function FollowUpsToday({ leads }: FollowUpsTodayProps) {
  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">Follow-ups Today</h2>
        <p className="text-xs text-slate-400 mt-0.5">{leads.length} scheduled</p>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <Bell className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-400 font-medium">No follow-ups today</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {leads.map((lead) => (
            <li
              key={lead.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-white bg-white/60 hover:bg-white/80 transition-all"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/leads/${lead.id}`}
                  className="text-sm font-semibold text-[#1B3A6B] hover:underline truncate block"
                >
                  {lead.company_name}
                </Link>
                <p className="text-xs text-slate-500 truncate mt-0.5">{lead.contact_name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Last contacted {formatRelativeTime(lead.last_contacted_at)}
                </p>
              </div>

              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${getStagePillClass(lead.stage)}`}>
                {lead.stage}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
