'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Calendar, ArrowRight, FileText, Upload, CheckSquare, AlertCircle, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Notification, NotificationType } from '@/types/database';
import { formatRelativeTime } from '@/lib/utils';
import { isToday, isThisWeek, parseISO } from 'date-fns';

const TYPE_MAP: Record<NotificationType, { Icon: React.ElementType; color: string }> = {
  follow_up_due: { Icon: Calendar, color: '#F59E0B' },
  stage_change: { Icon: ArrowRight, color: '#7C3AED' },
  note_added: { Icon: FileText, color: '#1D4ED8' },
  document_uploaded: { Icon: Upload, color: '#7C3AED' },
  task_due: { Icon: CheckSquare, color: '#D97706' },
  stale_lead: { Icon: AlertCircle, color: '#F59E0B' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*, lead:leads(id,company_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const ch = supabase.channel('notifications-page')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, load)
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    });
  }, [load]);

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', id);
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('user_id', user.id).eq('read', false);
  };

  const groups = {
    Today: notifications.filter(n => isToday(parseISO(n.created_at))),
    'This Week': notifications.filter(n => !isToday(parseISO(n.created_at)) && isThisWeek(parseISO(n.created_at))),
    Earlier: notifications.filter(n => !isThisWeek(parseISO(n.created_at))),
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <div className="skeleton h-96 rounded-2xl" />;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A]">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-slate-500 mt-0.5">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1B3A6B] bg-[#1B3A6B]/8 rounded-xl hover:bg-[#1B3A6B]/15 transition-colors">
            <Check size={12} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <Bell className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="font-semibold text-[#0F172A]">You&apos;re all caught up!</p>
          <p className="text-sm text-slate-400">No notifications at the moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([group, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{group}</h2>
                <div className="glass-card divide-y divide-white/60">
                  {items.map(n => {
                    const { Icon, color } = TYPE_MAP[n.type] ?? { Icon: Bell, color: '#94A3B8' };
                    const lead = n.lead as { id: string; company_name: string } | undefined;
                    return (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-white/40 transition-colors ${!n.read ? 'border-l-2 border-[#1B3A6B]' : ''}`}
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: color + '15' }}>
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.read ? 'font-semibold text-[#0F172A]' : 'font-medium text-slate-700'}`}>{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                          {lead && (
                            <Link href={`/leads/${lead.id}`} onClick={e => e.stopPropagation()}
                              className="text-xs text-[#1B3A6B] font-medium hover:underline mt-1 block">
                              {lead.company_name}
                            </Link>
                          )}
                          <p className="text-[11px] text-slate-400 mt-1">{formatRelativeTime(n.created_at)}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-[#1B3A6B] flex-shrink-0 mt-1.5" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
