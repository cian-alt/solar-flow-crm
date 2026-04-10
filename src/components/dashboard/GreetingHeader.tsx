'use client';

import { getGreeting } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

interface GreetingHeaderProps {
  firstName: string | null;
}

const MOTIVATIONAL_SUBTITLES = {
  morning: "Let's close some deals today.",
  afternoon: "Keep the momentum going.",
  evening: "Great work today — review your pipeline.",
};

export default function GreetingHeader({ firstName }: GreetingHeaderProps) {
  const { greeting, emoji } = getGreeting();
  const hour = new Date().getHours();
  const timeKey = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const subtitle = MOTIVATIONAL_SUBTITLES[timeKey];
  const today = formatDate(new Date());

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight">
          {greeting}, {firstName ?? 'there'}! {emoji}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="text-sm text-slate-400 font-medium tabular-nums">
        {today}
      </div>
    </div>
  );
}
