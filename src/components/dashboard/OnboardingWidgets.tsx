'use client';

import Link from "next/link";
import { Rocket, AlertCircle, Zap, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface GoingLive {
  id: string;
  name: string;
  date: string | null;
}

interface Props {
  active: number;
  overdue: number;
  goingLive: GoingLive[];
}

export default function OnboardingWidgets({ active, overdue, goingLive }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Link href="/onboarding" className="glass-card p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform">
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Rocket size={20} /></div>
        <div>
          <p className="text-2xl font-extrabold text-[#0F172A] leading-none">{active}</p>
          <p className="text-xs text-slate-500 mt-1">Active onboardings</p>
        </div>
      </Link>

      <Link href="/onboarding" className="glass-card p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform">
        <div className="relative w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
          <AlertCircle size={20} />
          {overdue > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">{overdue > 99 ? "99+" : overdue}</span>}
        </div>
        <div>
          <p className="text-2xl font-extrabold text-[#0F172A] leading-none">{overdue}</p>
          <p className="text-xs text-slate-500 mt-1">Overdue steps</p>
        </div>
      </Link>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={15} className="text-amber-500" />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Going live this week</p>
        </div>
        {goingLive.length === 0 ? (
          <p className="text-sm text-slate-400">No clients going live this week.</p>
        ) : (
          <ul className="space-y-1.5">
            {goingLive.slice(0, 4).map((g) => (
              <li key={g.id}>
                <Link href={`/onboarding/${g.id}`} className="flex items-center justify-between gap-2 text-sm text-slate-700 hover:text-[#1B3A6B] group">
                  <span className="truncate">{g.name}</span>
                  <span className="text-xs text-slate-400 shrink-0 flex items-center gap-1">{formatDate(g.date)} <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
