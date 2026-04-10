'use client';

import { FileText, Phone, ArrowRight, CheckSquare, Upload, Plus } from 'lucide-react';
import { formatRelativeTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { Activity } from '@/types/database';

interface Props { activities: Activity[]; }

const TYPE_MAP: Record<string, { Icon: React.ElementType; color: string }> = {
  created: { Icon: Plus, color: '#059669' },
  stage_change: { Icon: ArrowRight, color: '#7C3AED' },
  note: { Icon: FileText, color: '#1D4ED8' },
  note_added: { Icon: FileText, color: '#1D4ED8' },
  call: { Icon: Phone, color: '#059669' },
  call_logged: { Icon: Phone, color: '#059669' },
  task: { Icon: CheckSquare, color: '#D97706' },
  task_created: { Icon: CheckSquare, color: '#D97706' },
  document: { Icon: Upload, color: '#7C3AED' },
  document_uploaded: { Icon: Upload, color: '#7C3AED' },
};

function getTypeInfo(type: string) {
  const key = Object.keys(TYPE_MAP).find(k => type.toLowerCase().includes(k));
  return TYPE_MAP[key ?? ''] ?? { Icon: FileText, color: '#94A3B8' };
}

export default function ActivityTimeline({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 gap-2 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
          <FileText className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium text-sm">No activity yet</p>
        <p className="text-slate-400 text-xs">Activity will appear here as you work this lead.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />
      <ul className="space-y-5">
        {activities.map(activity => {
          const { Icon, color } = getTypeInfo(activity.type);
          const userName = (activity.user as { full_name?: string; email?: string } | undefined)?.full_name
            ?? (activity.user as { full_name?: string; email?: string } | undefined)?.email
            ?? 'Unknown';
          const initials = getInitials(userName);
          const avatarBg = getAvatarColor(userName);

          return (
            <li key={activity.id} className="flex gap-4 relative">
              <div className="w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0 mt-0.5" style={{ background: color + '20', border: `1.5px solid ${color}40` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-start gap-2 flex-wrap">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: avatarBg }}>
                    {initials}
                  </div>
                  <p className="text-sm text-slate-700 flex-1">
                    <span className="font-medium text-[#0F172A]">{userName}</span>
                    {' '}{activity.description}
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 ml-7">{formatRelativeTime(activity.created_at)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
