'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatEuro, formatEuroCompact } from '@/lib/utils';
import type { MonthlyRevenue } from '@/types/database';

interface MonthlyRevenueChartProps {
  data: MonthlyRevenue[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.8)',
        borderRadius: '10px',
        boxShadow: '0 4px 16px rgba(31,38,135,0.1)',
        padding: '10px 14px',
      }}
    >
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-base font-bold text-[#1B3A6B]">{formatEuro(payload[0].value)}</p>
    </div>
  );
}

export default function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">Monthly Revenue</h2>
        <p className="text-xs text-slate-400 mt-0.5">Last 6 months</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatEuroCompact(v)}
            tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(27,58,107,0.05)', radius: 6 }} />
          <Bar dataKey="revenue" fill="#1B3A6B" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
