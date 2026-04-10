'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, Layers, Sparkles, BarChart2 } from 'lucide-react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { formatEuro, formatEuroCompact } from '@/lib/utils';
import type { MRRMetrics, ForecastMonth } from '@/lib/revenue';

interface Props {
  mrrMetrics: MRRMetrics;
  forecastData: ForecastMonth[];
}

// ── Animated counter ──────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * target);
      if (progress < 1) { raf.current = requestAnimationFrame(tick); }
      else { setDisplay(target); }
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current !== null) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return display;
}

// ── Animated MRR card ─────────────────────────────────────────────────────────
interface MRRCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentColor: string;
  trend?: number; // percentage vs last period, undefined = hide
  index: number;
}

function MRRCard({ label, value, icon, accentColor, trend, index }: MRRCardProps) {
  const animated = useCountUp(value);
  return (
    <motion.div
      className="glass-card p-5 flex flex-col gap-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: accentColor + '18' }}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}>
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#0F172A] tabular-nums leading-none">
          {formatEuro(animated)}
        </p>
        {trend !== undefined && (
          <p className="text-xs text-slate-400 mt-1">vs last month</p>
        )}
      </div>
    </motion.div>
  );
}

// ── Forecast chart tooltip ────────────────────────────────────────────────────
interface TooltipPayloadItem { value: number; name: string; color: string }
function ForecastTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.97)',
      border: '1px solid rgba(255,255,255,0.8)',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      <p className="text-xs font-semibold text-slate-500 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-xs text-slate-600">{p.name}</span>
          </div>
          <span className="text-xs font-bold" style={{ color: p.color }}>{formatEuro(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between">
          <span className="text-xs text-slate-500">Opportunity gap</span>
          <span className="text-xs font-semibold text-[#6366F1]">
            {formatEuro(Math.max(0, (payload[1]?.value ?? 0) - (payload[0]?.value ?? 0)))}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RevenueIntelligence({ mrrMetrics, forecastData }: Props) {
  const { currentMRR, projectedMRR, newMRRThisMonth, lastMonthMRR } = mrrMetrics;

  const isEmpty = forecastData.every((d) => d.contracted === 0 && d.pipeline === 0);

  const mrrTrend = lastMonthMRR > 0
    ? ((currentMRR - lastMonthMRR) / lastMonthMRR) * 100
    : undefined;

  const currentMonthIdx = 0; // forecastData[0] = current month

  if (isEmpty) {
    return (
      <div className="glass-card p-10 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center">
          <BarChart2 className="w-6 h-6 text-slate-300" />
        </div>
        <p className="font-semibold text-[#0F172A]">No MRR data yet</p>
        <p className="text-sm text-slate-400 max-w-xs">
          Close your first deal with a monthly contract to see MRR tracking and revenue forecasting here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[#1B3A6B]" />
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Revenue Intelligence</h2>
      </div>

      {/* MRR Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MRRCard
          label="Current MRR"
          value={currentMRR}
          icon={<Activity className="w-5 h-5" style={{ color: '#059669' }} />}
          accentColor="#059669"
          trend={mrrTrend}
          index={0}
        />
        <MRRCard
          label="Projected MRR"
          value={projectedMRR}
          icon={<Layers className="w-5 h-5" style={{ color: '#1B3A6B' }} />}
          accentColor="#1B3A6B"
          index={1}
        />
        <MRRCard
          label="New MRR This Month"
          value={newMRRThisMonth}
          icon={<Sparkles className="w-5 h-5" style={{ color: '#7C3AED' }} />}
          accentColor="#7C3AED"
          index={2}
        />
      </div>

      {/* Forecast Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart — takes 2/3 width on large screens */}
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wide mb-1">
            3-Month Revenue Forecast
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Contracted MRR vs total pipeline opportunity
          </p>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 320 }}>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={forecastData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="contractedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="pipelineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatEuroCompact(v)}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip content={<ForecastTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(value) => (
                      <span style={{ color: '#64748B', fontWeight: 500 }}>{value}</span>
                    )}
                  />
                  {/* Pipeline area behind contracted (renders first = bottom layer) */}
                  <Area
                    type="monotone"
                    dataKey="pipeline"
                    fill="url(#pipelineGrad)"
                    stroke="none"
                    legendType="none"
                  />
                  {/* Contracted area on top (masks the pipeline area in the contracted region) */}
                  <Area
                    type="monotone"
                    dataKey="contracted"
                    fill="url(#contractedGrad)"
                    stroke="none"
                    legendType="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="contracted"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#059669', strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    name="Contracted MRR"
                  />
                  <Line
                    type="monotone"
                    dataKey="pipeline"
                    stroke="#6366F1"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    name="Pipeline Forecast"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Breakdown Table — 1/3 width */}
        <div className="glass-card p-5 flex flex-col">
          <h3 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wide mb-4">
            Monthly Breakdown
          </h3>
          <div className="flex-1 overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Month</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Contracted</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Forecast</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.map((row, i) => {
                  const isCurrent = i === currentMonthIdx;
                  return (
                    <tr
                      key={row.month}
                      className={`border-b border-slate-50 last:border-0 ${
                        isCurrent ? 'bg-[#1B3A6B]/5' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1B3A6B] flex-shrink-0" />
                          )}
                          <span className={`text-sm ${isCurrent ? 'font-semibold text-[#1B3A6B]' : 'text-slate-600'}`}>
                            {row.month}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-xs font-semibold text-emerald-600">
                          {formatEuroCompact(row.contracted)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-xs font-bold text-[#6366F1]">
                          {formatEuroCompact(row.pipeline)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Gap legend */}
          <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-emerald-500 rounded inline-block" />
              Contracted
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-indigo-500 rounded inline-block" style={{ borderTop: '2px dashed #6366F1', background: 'none' }} />
              Pipeline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
