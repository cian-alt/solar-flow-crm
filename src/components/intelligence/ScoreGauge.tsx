'use client';

import { motion } from "framer-motion";
import type { IntelligenceCategory } from "@/types/database";
import { CATEGORY_META } from "./helpers";

interface ScoreGaugeProps {
  score: number;
  category: IntelligenceCategory;
  size?: number; // px diameter
  showLabel?: boolean;
}

export default function ScoreGauge({ score, category, size = 120, showLabel = true }: ScoreGaugeProps) {
  const meta = CATEGORY_META[category];
  const stroke = size >= 100 ? 9 : 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={meta.hex}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="font-bold leading-none"
          style={{ color: meta.hex, fontSize: size * 0.3 }}
        >
          {clamped}
        </motion.span>
        {showLabel && (
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: meta.hex }}>
            {meta.label}
          </span>
        )}
      </div>
    </div>
  );
}
