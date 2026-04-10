'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { LeadsByStage } from '@/types/database';

interface LeadsByStageChartProps {
  data: LeadsByStage[];
}

const STAGE_HEX: Record<string, string> = {
  'New Lead': '#0369A1',
  'Cold Called': '#475569',
  'Pending Demo': '#D97706',
  'Demo Scheduled': '#B45309',
  'Demo Done': '#1D4ED8',
  'Proposal Sent': '#7C3AED',
  'Closed Won': '#059669',
  'Closed Lost': '#DC2626',
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
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
      <p className="text-xs font-medium text-slate-500 mb-0.5">{payload[0].name}</p>
      <p className="text-base font-bold text-[#0F172A]">{payload[0].value} leads</p>
    </div>
  );
}

export default function LeadsByStageChart({ data }: LeadsByStageChartProps) {
  const activeData = data.filter((d) => d.stage !== 'Closed Lost');
  const total = activeData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">Leads by Stage</h2>
        <p className="text-xs text-slate-400 mt-0.5">Active pipeline breakdown</p>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={activeData}
              dataKey="count"
              nameKey="stage"
              innerRadius={58}
              outerRadius={90}
              paddingAngle={2}
              strokeWidth={0}
            >
              {activeData.map((entry) => (
                <Cell key={entry.stage} fill={STAGE_HEX[entry.stage] ?? '#94A3B8'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-[#0F172A]">{total}</span>
          <span className="text-xs text-slate-400">active</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {activeData.map((entry) => (
          <div key={entry.stage} className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: STAGE_HEX[entry.stage] ?? '#94A3B8' }}
            />
            <span className="text-xs text-slate-600 truncate">{entry.stage}</span>
            <span className="text-xs font-semibold text-[#0F172A] ml-auto tabular-nums">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
