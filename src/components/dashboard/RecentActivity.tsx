'use client';

import Link from 'next/link';
import { FileText, Phone, ArrowRight, CheckSquare, Upload } from 'lucide-react';
import { formatRelativeTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { Activity } from '@/types/database';

interface RecentActivityProps {
  activities: (Activity & { lead?: { id: string; company_name: string } })[];
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  note: FileText,
  call: Phone,
  stage_change: ArrowRight,
  task: CheckSquare,
  document: Upload,
};

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">Recent Activity</h2>
        <p className="text-xs text-slate-400 mt-0.5">Last 10 actions across your pipeline</p>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No recent activity</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-50">
          {activities.map((activity) => {
            const userName = activity.user?.full_name ?? activity.user?.email ?? 'Unknown';
            const initials = getInitials(userName);
            const avatarBg = getAvatarColor(userName);
            const activityType = activity.type?.toLowerCase() ?? '';
            const IconComponent = Object.entries(TYPE_ICONS).find(([key]) => activityType.includes(key))?.[1] ?? FileText;

            return (
              <li key={activity.id} className="py-3 flex items-start gap-3">
                {/* User avatar */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5"
                  style={{ background: avatarBg }}
                >
                  {initials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1.5 flex-wrap">
                    {/* Type icon */}
                    <span className="mt-0.5 text-slate-400 flex-shrink-0">
                      <IconComponent className="w-3.5 h-3.5" />
                    </span>
                    <p className="text-xs text-slate-700 leading-snug flex-1 min-w-0">
                      <span className="font-medium text-[#0F172A]">{userName}</span>
                      {' '}{activity.description}
                      {activity.lead && (
                        <>
                          {' — '}
                          <Link
                            href={`/leads/${activity.lead.id}`}
                            className="text-[#1B3A6B] font-medium hover:underline"
                          >
                            {activity.lead.company_name}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{formatRelativeTime(activity.created_at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
