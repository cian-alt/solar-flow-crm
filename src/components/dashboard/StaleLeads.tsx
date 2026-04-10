'use client';

import Link from 'next/link';
import { AlertTriangle, Phone } from 'lucide-react';
import { formatDaysAgo } from '@/lib/utils';
import type { Lead } from '@/types/database';

interface StaleLeadsProps {
  leads: Lead[];
}

export default function StaleLeads({ leads }: StaleLeadsProps) {
  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">Stale Leads</h2>
          <p className="text-xs text-slate-400 mt-0.5">{leads.length} need attention</p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-sm text-slate-400 font-medium">No stale leads</p>
          <p className="text-xs text-slate-300">Your pipeline is fresh!</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {leads.map((lead) => (
            <li
              key={lead.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50/70 transition-all"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <Link
                  href={`/leads/${lead.id}`}
                  className="text-sm font-semibold text-[#1B3A6B] hover:underline truncate block"
                >
                  {lead.company_name}
                </Link>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Last contact: {formatDaysAgo(lead.last_contacted_at)}
                </p>
              </div>

              <Link
                href={`/leads/${lead.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg bg-[#1B3A6B] hover:bg-[#2C5DB4] transition-colors flex-shrink-0"
              >
                <Phone className="w-3 h-3" />
                Call Now
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
