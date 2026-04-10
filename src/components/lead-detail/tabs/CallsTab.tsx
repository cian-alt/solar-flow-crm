'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { Call, CallOutcome } from '@/types/database';
import toast from 'react-hot-toast';

interface Props { calls: Call[]; leadId: string; onCallsChange: (calls: Call[]) => void; }

const OUTCOME_STYLES: Record<CallOutcome, { label: string; cls: string }> = {
  answered: { label: 'Answered', cls: 'bg-emerald-50 text-emerald-700' },
  voicemail: { label: 'Voicemail', cls: 'bg-amber-50 text-amber-700' },
  no_answer: { label: 'No Answer', cls: 'bg-slate-100 text-slate-600' },
  callback_requested: { label: 'Callback', cls: 'bg-blue-50 text-blue-700' },
  not_interested: { label: 'Not Interested', cls: 'bg-red-50 text-red-700' },
  interested: { label: 'Interested', cls: 'bg-emerald-100 text-emerald-800' },
};

export default function CallsTab({ calls, leadId, onCallsChange }: Props) {
  const [outcome, setOutcome] = useState<CallOutcome>('answered');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const logCall = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data, error } = await supabase.from('calls').insert({
      lead_id: leadId, caller_id: user.id, outcome, notes: notes || null,
      duration_minutes: duration ? Number(duration) : null,
      called_at: new Date().toISOString(),
    }).select('*, caller:profiles!caller_id(id,full_name,avatar_initials)').single();

    if (error) { toast.error('Failed to log call'); setSaving(false); return; }

    await supabase.from('activities').insert({
      lead_id: leadId, user_id: user.id, type: 'call_logged',
      description: `Logged a call — ${OUTCOME_STYLES[outcome].label}`, metadata: { outcome },
    });

    onCallsChange([data as Call, ...calls]);
    setOutcome('answered'); setDuration(''); setNotes('');
    toast.success('Call logged');
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Log call form */}
      <div className="bg-white/60 rounded-xl border border-white/80 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-[#0F172A]">Log Call</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Outcome</label>
            <select value={outcome} onChange={e => setOutcome(e.target.value as CallOutcome)}
              className="w-full px-3 py-2 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30">
              {Object.entries(OUTCOME_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Duration (min)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Optional"
              className="w-full px-3 py-2 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Call notes..."
            className="w-full px-3 py-2 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30 resize-none" />
        </div>
        <button onClick={logCall} disabled={saving}
          className="px-4 py-2 text-sm font-semibold bg-[#1B3A6B] text-white rounded-lg hover:bg-[#152E55] transition-colors disabled:opacity-40">
          {saving ? 'Logging...' : 'Log Call'}
        </button>
      </div>

      {calls.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2">
          <Phone className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-400">No calls logged yet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {calls.map(call => {
            const caller = call.caller as { full_name?: string } | undefined;
            const callerName = caller?.full_name ?? 'Unknown';
            const outcomeInfo = OUTCOME_STYLES[call.outcome];
            return (
              <li key={call.id} className="bg-white/60 rounded-xl border border-white/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ background: getAvatarColor(callerName) }}>
                      {getInitials(callerName)}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-[#0F172A]">{callerName}</span>
                      <span className="text-xs text-slate-400 ml-2">{formatDateTime(call.called_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${outcomeInfo.cls}`}>{outcomeInfo.label}</span>
                    {call.duration_minutes && <span className="text-xs text-slate-400">{call.duration_minutes}m</span>}
                  </div>
                </div>
                {call.notes && <p className="text-xs text-slate-600 mt-2 ml-9">{call.notes}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
