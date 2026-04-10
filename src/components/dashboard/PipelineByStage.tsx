'use client';

import { motion } from 'framer-motion';
import { formatEuroCompact } from '@/lib/utils';
import { STAGE_ORDER, STAGE_COLORS } from '@/lib/utils';
import type { LeadsByStage } from '@/types/database';
import type { LeadStage } from '@/types/database';

interface PipelineByStageProps {
  data: LeadsByStage[];
}

const ACTIVE_STAGES: LeadStage[] = STAGE_ORDER.filter((s) => s !== 'Closed Lost' && s !== 'Closed Won');

export default function PipelineByStage({ data }: PipelineByStageProps) {
  const stageMap = Object.fromEntries(data.map((d) => [d.stage, d]));
  const activeData = ACTIVE_STAGES
    .map((stage) => stageMap[stage] ?? { stage, count: 0, value: 0 })
    .filter((d) => d.value > 0 || d.count > 0);

  const maxValue = Math.max(...activeData.map((d) => d.value), 1);

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">Pipeline by Stage</h2>
        <p className="text-xs text-slate-400 mt-0.5">Deal value in active stages</p>
      </div>

      <div className="flex flex-col gap-3">
        {activeData.map((entry, i) => {
          const width = maxValue > 0 ? (entry.value / maxValue) * 100 : 0;
          const colors = STAGE_COLORS[entry.stage as LeadStage];

          return (
            <div key={entry.stage} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-36 flex-shrink-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: colors.text }}
                />
                <span className="text-xs text-slate-600 truncate">{entry.stage}</span>
              </div>

              <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: colors.text }}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                />
              </div>

              <span className="text-xs font-semibold text-[#0F172A] w-16 text-right tabular-nums flex-shrink-0">
                {formatEuroCompact(entry.value)}
              </span>
            </div>
          );
        })}

        {activeData.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No active pipeline data</p>
        )}
      </div>
    </div>
  );
}
