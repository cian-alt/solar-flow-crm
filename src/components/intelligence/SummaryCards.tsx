'use client';

import { motion } from "framer-motion";
import { Brain, Flame, TrendingUp } from "lucide-react";
import type { IntelligenceCategory } from "@/types/database";
import { formatEuroCompact } from "@/lib/utils";
import { CATEGORY_META, CATEGORY_ORDER } from "./helpers";

export interface IntelligenceStats {
  totalScored: number;
  byCategory: Record<IntelligenceCategory, number>;
  potentialMrrHot: number;
  potentialMrrWarm: number;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function SummaryCards({ stats }: { stats: IntelligenceStats }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3"
    >
      <motion.div variants={item} className="glass-card p-4 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[#4C1D95]">
          <Brain size={15} />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Scored</span>
        </div>
        <span className="text-2xl font-extrabold text-[#0F172A]">{stats.totalScored}</span>
        <span className="text-[10px] text-slate-400">total leads</span>
      </motion.div>

      {CATEGORY_ORDER.map((cat) => {
        const meta = CATEGORY_META[cat];
        return (
          <motion.div key={cat} variants={item} className="glass-card p-4 flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {meta.emoji} {meta.label}
            </span>
            <span className="text-2xl font-extrabold" style={{ color: meta.hex }}>
              {stats.byCategory[cat]}
            </span>
            <span className="text-[10px] text-slate-400">{shortHint(cat)}</span>
          </motion.div>
        );
      })}

      <motion.div variants={item} className="glass-card p-4 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-red-600">
          <Flame size={15} />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hot MRR</span>
        </div>
        <span className="text-xl font-extrabold text-[#0F172A]">{formatEuroCompact(stats.potentialMrrHot)}</span>
        <span className="text-[10px] text-slate-400">if all Hot convert</span>
      </motion.div>

      <motion.div variants={item} className="glass-card p-4 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-amber-600">
          <TrendingUp size={15} />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Warm MRR</span>
        </div>
        <span className="text-xl font-extrabold text-[#0F172A]">{formatEuroCompact(stats.potentialMrrWarm)}</span>
        <span className="text-[10px] text-slate-400">if all Warm convert</span>
      </motion.div>
    </motion.div>
  );
}

function shortHint(cat: IntelligenceCategory): string {
  switch (cat) {
    case "Hot": return "call today";
    case "Warm": return "this week";
    case "Nurture": return "monthly";
    case "Cold": return "deprioritise";
  }
}
