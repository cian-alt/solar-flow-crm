'use client';

import { TrendingUp, Calendar, Users, Target } from 'lucide-react';
import KPICard from './KPICard';
import { formatEuroCompact } from '@/lib/utils';

interface KPIGridProps {
  totalRevenue: number;
  revenueThisMonth: number;
  activeLeads: number;
  conversionRate: number;
}

export default function KPIGrid({ totalRevenue, revenueThisMonth, activeLeads, conversionRate }: KPIGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Total Revenue"
        value={totalRevenue}
        icon={<TrendingUp className="w-5 h-5 text-[#1B3A6B]" />}
        format={formatEuroCompact}
        index={0}
      />
      <KPICard
        label="Revenue This Month"
        value={revenueThisMonth}
        icon={<Calendar className="w-5 h-5 text-[#1B3A6B]" />}
        format={formatEuroCompact}
        index={1}
      />
      <KPICard
        label="Active Leads"
        value={activeLeads}
        icon={<Users className="w-5 h-5 text-[#1B3A6B]" />}
        format={v => Math.round(v).toLocaleString()}
        index={2}
      />
      <KPICard
        label="Conversion Rate"
        value={conversionRate}
        icon={<Target className="w-5 h-5 text-[#1B3A6B]" />}
        format={v => `${v.toFixed(1)}%`}
        index={3}
      />
    </div>
  );
}
