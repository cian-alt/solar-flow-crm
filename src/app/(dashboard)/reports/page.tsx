'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Lead, Profile } from '@/types/database';
import { formatEuroCompact, formatEuro, STAGE_ORDER } from '@/lib/utils';
import { subMonths, startOfMonth, format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const SOURCE_COLORS: Record<string, string> = {
  Website: '#1B3A6B', Referral: '#059669', 'Cold Call': '#D97706',
  LinkedIn: '#0077B5', 'Trade Show': '#7C3AED', 'Google Ads': '#EA4335',
  'Facebook Ads': '#1877F2', Partner: '#06B6D4', Other: '#6B7280',
};

function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 12, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      {label && <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-bold text-[#1B3A6B]">{typeof p.value === 'number' && p.value > 1000 ? formatEuro(p.value) : p.value}{p.name ? ` ${p.name}` : ''}</p>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 6), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from('leads').select('*, assigned_profile:profiles!assigned_to(id,full_name)').gte('created_at', dateFrom).lte('created_at', dateTo + 'T23:59:59'),
      supabase.from('profiles').select('*'),
    ]);
    setLeads((l as Lead[]) ?? []);
    setProfiles((p as Profile[]) ?? []);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // Analytics
  const closedWon = leads.filter(l => l.stage === 'Closed Won');

  // Monthly revenue
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const ms = startOfMonth(d).toISOString();
    const me = startOfMonth(subMonths(d, -1)).toISOString();
    const rev = closedWon.filter(l => l.updated_at >= ms && l.updated_at < me).reduce((s, l) => s + (l.deal_value ?? 0), 0);
    return { month: format(d, 'MMM'), revenue: rev };
  });

  // Stage distribution
  const byStage = STAGE_ORDER.map(stage => ({
    stage, count: leads.filter(l => l.stage === stage).length,
  })).filter(s => s.count > 0);

  // By source
  const sourceMap: Record<string, number> = {};
  leads.forEach(l => { if (l.lead_source) sourceMap[l.lead_source] = (sourceMap[l.lead_source] ?? 0) + 1; });
  const bySource = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

  // Team performance
  const perfMap: Record<string, { name: string; count: number; revenue: number; assigned: number }> = {};
  leads.forEach(l => {
    const pid = l.assigned_to ?? 'unassigned';
    const profile = profiles.find(p => p.id === pid);
    const name = profile?.full_name ?? profile?.email ?? 'Unassigned';
    if (!perfMap[pid]) perfMap[pid] = { name, count: 0, revenue: 0, assigned: 0 };
    perfMap[pid].assigned++;
    if (l.stage === 'Closed Won') { perfMap[pid].count++; perfMap[pid].revenue += l.deal_value ?? 0; }
  });
  const teamPerf = Object.values(perfMap).sort((a, b) => b.revenue - a.revenue);

  const exportCSV = () => {
    const headers = ['Company','Contact','Email','Stage','Deal Value','Source','Assigned To','Created'];
    const rows = leads.map(l => [l.company_name, l.contact_name, l.email ?? '', l.stage, l.deal_value ?? '', l.lead_source ?? '', (l.assigned_profile as Profile | undefined)?.full_name ?? '', l.created_at.split('T')[0]]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'solar-flow-report.csv'; a.click();
  };

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A]">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Analytics for your solar pipeline</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none" />
          </div>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: leads.length, fmt: (v: number) => String(v) },
          { label: 'Closed Won', value: closedWon.length, fmt: (v: number) => String(v) },
          { label: 'Revenue', value: closedWon.reduce((s, l) => s + (l.deal_value ?? 0), 0), fmt: formatEuroCompact },
          { label: 'Conversion', value: leads.length > 0 ? (closedWon.length / leads.length) * 100 : 0, fmt: (v: number) => `${v.toFixed(1)}%` },
        ].map(({ label, value, fmt }) => (
          <div key={label} className="glass-card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-[#0F172A] mt-1">{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide mb-4">Monthly Revenue</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatEuroCompact(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<GlassTooltip />} />
              <Bar dataKey="revenue" fill="#1B3A6B" radius={[6,6,0,0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide mb-4">Pipeline by Stage</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byStage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<GlassTooltip />} />
              <Bar dataKey="count" fill="#1B3A6B" radius={[0,6,6,0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide mb-4">Leads by Source</h2>
          {bySource.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No source data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={bySource} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2} strokeWidth={0}>
                  {bySource.map(entry => (
                    <Cell key={entry.name} fill={SOURCE_COLORS[entry.name] ?? '#94A3B8'} />
                  ))}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {bySource.map(entry => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SOURCE_COLORS[entry.name] ?? '#94A3B8' }} />
                <span className="text-xs text-slate-500 truncate">{entry.name}</span>
                <span className="text-xs font-semibold text-[#0F172A] ml-auto">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team performance */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide mb-4">Team Performance</h2>
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-400 uppercase">Name</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium text-slate-400 uppercase">Leads</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium text-slate-400 uppercase">Won</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-400 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {teamPerf.map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 text-sm font-medium text-[#0F172A] truncate max-w-[120px]">{p.name}</td>
                    <td className="px-3 py-2.5 text-center text-sm text-slate-600">{p.assigned}</td>
                    <td className="px-3 py-2.5 text-center text-sm font-semibold text-emerald-600">{p.count}</td>
                    <td className="px-3 py-2.5 text-right text-sm font-bold text-[#1B3A6B]">{formatEuroCompact(p.revenue)}</td>
                  </tr>
                ))}
                {teamPerf.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400 text-sm">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
