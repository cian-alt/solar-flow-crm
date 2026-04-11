'use client';

import { useState } from 'react';
import { Plus, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { irishSickLeaveEntitlement, workingDaysBetween } from '@/lib/commission';
import type { Profile, EmployeeProfile, LeaveRequest, LeaveType } from '@/types/database';

interface Props {
  profile: Profile | null;
  employeeProfile: EmployeeProfile | null;
  leaveRequests: LeaveRequest[];
}

const LEAVE_LABELS: Record<string, string> = {
  annual: 'Annual Leave', sick: 'Sick Leave', unpaid: 'Unpaid',
  maternity: 'Maternity', paternity: 'Paternity', parents: "Parent's Leave",
  force_majeure: 'Force Majeure', compassionate: 'Compassionate',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-600',
};

type RequestType = 'annual' | 'sick';

interface LeaveForm {
  type: RequestType;
  start_date: string;
  end_date: string;
  reason: string;
}

export default function MyLeaveTab({ profile, employeeProfile, leaveRequests: initial }: Props) {
  const [leaves, setLeaves] = useState(initial);
  const [showForm, setShowForm] = useState<RequestType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<LeaveForm>({ type: 'annual', start_date: '', end_date: '', reason: '' });

  const supabase = createClient();
  const currentYear = new Date().getFullYear();

  const annualUsed = leaves.filter(l =>
    l.leave_type === 'annual' && l.status !== 'rejected' && l.start_date >= `${currentYear}-01-01`
  ).reduce((s, l) => s + l.days_requested, 0);

  const sickUsed = leaves.filter(l =>
    l.leave_type === 'sick' && l.status !== 'rejected' && l.start_date >= `${currentYear}-01-01`
  ).reduce((s, l) => s + l.days_requested, 0);

  const annualEntitlement = employeeProfile?.annual_leave_entitlement ?? 20;
  const sickEntitlement = irishSickLeaveEntitlement(currentYear);

  const openForm = (type: RequestType) => {
    setForm({ type, start_date: '', end_date: '', reason: '' });
    setShowForm(type);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.start_date || !form.end_date || !profile) return;
    setSubmitting(true);

    const days = workingDaysBetween(form.start_date, form.end_date);

    // Sick leave: auto-approve for 1-2 days, pending for 3+
    const isSick = form.type === 'sick';
    const status = isSick && days <= 2 ? 'approved' : 'pending';

    const { data, error } = await supabase.from('leave_requests').insert({
      employee_id: profile.id,
      leave_type: form.type as LeaveType,
      start_date: form.start_date,
      end_date: form.end_date,
      days_requested: days,
      status,
      reason: form.reason || null,
    }).select().maybeSingle();

    if (!error && data) {
      setLeaves(prev => [data as LeaveRequest, ...prev]);

      // Notify admins of leave request (if pending)
      if (status === 'pending') {
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
        for (const admin of admins ?? []) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            type: 'leave_request',
            title: 'New leave request',
            message: `${profile.full_name ?? profile.email} has submitted a ${LEAVE_LABELS[form.type]} request (${days} day${days !== 1 ? 's' : ''}).`,
          });
        }
      }
    }

    setShowForm(null);
    setSubmitting(false);
  };

  const pending = leaves.filter(l => l.status === 'pending');
  const history = leaves.filter(l => l.status !== 'pending');

  return (
    <div className="space-y-4">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Annual Leave</p>
          <p className="text-2xl font-bold text-[#0F172A]">{annualEntitlement - annualUsed}</p>
          <p className="text-xs text-slate-400">days remaining</p>
          <p className="text-[11px] text-slate-400 mt-1">{annualUsed} of {annualEntitlement} used</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Sick Leave</p>
          <p className="text-2xl font-bold text-[#0F172A]">{sickEntitlement - sickUsed}</p>
          <p className="text-xs text-slate-400">days remaining</p>
          <p className="text-[11px] text-slate-400 mt-1">{sickUsed} of {sickEntitlement} used</p>
        </div>
        <div className="glass-card p-4 sm:col-span-2 flex flex-col justify-between">
          <div className="flex items-start gap-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">IE Law Note</p>
            <Info size={10} className="text-slate-300 mt-0.5" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Sick Leave Act 2022: {sickEntitlement} statutory sick days in {currentYear}, paid at 70% (max €110/day). Doctor&apos;s note required for 3+ consecutive days.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => openForm('annual')}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#1B3A6B] rounded-xl hover:bg-[#1B3A6B]/90 transition-colors">
          <Plus size={14} /> Apply for Annual Leave
        </button>
        <button onClick={() => openForm('sick')}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">
          <Plus size={14} /> Apply for Sick Leave
        </button>
      </div>

      {/* Leave Request Form */}
      {showForm && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#0F172A]">
            {showForm === 'annual' ? 'Annual Leave Request' : 'Sick Leave Request'}
          </h3>
          {showForm === 'sick' && (
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
              <p className="text-xs text-amber-700">
                <strong>Reminder:</strong> Sick leave for 1–2 days is auto-approved. For 3+ consecutive days, a doctor&apos;s note is required by Irish law and the request will go to your manager for approval.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Start Date</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white/70 px-3 text-sm focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">End Date</label>
              <input type="date" name="end_date" value={form.end_date} onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white/70 px-3 text-sm focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 focus:outline-none" />
            </div>
          </div>
          {form.start_date && form.end_date && (
            <p className="text-xs text-slate-500">
              {workingDaysBetween(form.start_date, form.end_date)} working day(s) requested
            </p>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
              Reason {showForm === 'annual' ? '(optional)' : '(optional for 1-2 days)'}
            </label>
            <textarea name="reason" value={form.reason} onChange={handleChange} rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm resize-none focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(null)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || !form.start_date || !form.end_date}
              className="px-5 py-1.5 text-sm font-semibold text-white bg-[#1B3A6B] rounded-xl hover:bg-[#1B3A6B]/90 disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {pending.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Pending Requests</h3>
          <div className="space-y-2">
            {pending.map(lr => (
              <div key={lr.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 border border-amber-100/60">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">{LEAVE_LABELS[lr.leave_type]}</p>
                  <p className="text-xs text-slate-500">{formatDate(lr.start_date)} – {formatDate(lr.end_date)} · {lr.days_requested} day{lr.days_requested !== 1 ? 's' : ''}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave History */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Leave History</h3>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No leave records yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map(lr => (
              <div key={lr.id} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#0F172A]">{LEAVE_LABELS[lr.leave_type] ?? lr.leave_type}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_COLORS[lr.status] ?? ''}`}>
                      {lr.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(lr.start_date)} – {formatDate(lr.end_date)} · {lr.days_requested} {lr.days_requested === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
