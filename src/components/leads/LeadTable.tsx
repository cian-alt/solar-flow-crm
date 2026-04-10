'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Trash2 } from 'lucide-react';
import type { Lead, Profile } from '@/types/database';
import { formatEuro, formatDate, getInitials, getAvatarColor, getStagePillClass } from '@/lib/utils';
import { LeadScoreBadge } from './LeadScoreBadge';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

type SortKey = 'company_name' | 'deal_value' | 'lead_score' | 'follow_up_date' | 'created_at';
type SortDir = 'asc' | 'desc';

interface LeadTableProps {
  leads: Lead[];
  onLeadsChange: (leads: Lead[]) => void;
}

export default function LeadTable({ leads, onLeadsChange }: LeadTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const supabase = createClient();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...leads].sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === leads.length) setSelected(new Set());
    else setSelected(new Set(leads.map(l => l.id)));
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selected.size} lead(s)?`)) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from('leads').delete().in('id', ids);
    if (error) { toast.error('Delete failed'); return; }
    onLeadsChange(leads.filter(l => !selected.has(l.id)));
    setSelected(new Set());
    toast.success(`Deleted ${ids.length} lead(s)`);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#1B3A6B]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#1B3A6B]" />;
  };

  const ColHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="px-4 py-3 text-left">
      <button onClick={() => handleSort(k)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-800 transition-colors">
        {label} <SortIcon k={k} />
      </button>
    </th>
  );

  const today = new Date().toISOString().split('T')[0];

  if (leads.length === 0) {
    return (
      <div className="glass-card p-12 flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <span className="text-2xl">📋</span>
        </div>
        <p className="text-slate-600 font-medium">No leads found</p>
        <p className="text-slate-400 text-sm">Try adjusting filters or add your first lead.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="px-4 py-2.5 bg-[#1B3A6B]/5 border-b border-white/60 flex items-center gap-3">
          <span className="text-sm font-medium text-[#1B3A6B]">{selected.size} selected</span>
          <button onClick={deleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 border-b border-white/60">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={selected.size === leads.length && leads.length > 0}
                  onChange={toggleAll}
                  className="rounded border-slate-300 text-[#1B3A6B] focus:ring-[#1B3A6B]/30" />
              </th>
              <ColHeader k="company_name" label="Company" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Stage</th>
              <ColHeader k="deal_value" label="Deal Value" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Assigned</th>
              <ColHeader k="lead_score" label="Score" />
              <ColHeader k="follow_up_date" label="Follow-up" />
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map(lead => {
              const assignedProfile = lead.assigned_profile as Profile | undefined;
              const name = assignedProfile?.full_name ?? null;
              const overdue = lead.follow_up_date && lead.follow_up_date < today;
              return (
                <tr key={lead.id}
                  className={`hover:bg-slate-50/60 transition-colors ${selected.has(lead.id) ? 'bg-[#1B3A6B]/3' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)}
                      className="rounded border-slate-300 text-[#1B3A6B] focus:ring-[#1B3A6B]/30" />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <Link href={`/leads/${lead.id}`} className="font-semibold text-[#1B3A6B] hover:underline">
                        {lead.company_name}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">{lead.contact_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStagePillClass(lead.stage)}`}>
                      {lead.stage}
                    </span>
                    {lead.is_stale && (
                      <span className="ml-1.5 inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-orange-100 text-orange-700">
                        Stale
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#0F172A] tabular-nums">
                    {formatEuro(lead.deal_value)}
                    {lead.system_size_kw && <span className="block text-xs text-slate-400 font-normal">{lead.system_size_kw} kW</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                          style={{ background: getAvatarColor(name) }}>
                          {getInitials(name)}
                        </div>
                        <span className="text-xs text-slate-600 truncate max-w-[100px]">{name}</span>
                      </div>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <LeadScoreBadge score={lead.lead_score} />
                  </td>
                  <td className="px-4 py-3">
                    {lead.follow_up_date ? (
                      <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                        {formatDate(lead.follow_up_date)}
                        {overdue && <span className="block text-[10px] text-red-400">Overdue</span>}
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/leads/${lead.id}`}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#1B3A6B] transition-colors">
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
