'use client';

import { useState } from 'react';
import { Plus, Check, X, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { irishSickLeaveEntitlement, workingDaysBetween } from '@/lib/commission';
import type { Profile, EmployeeProfile, LeaveRequest, LeaveType } from '@/types/database';

interface Props {
  profile: Profile;
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

const IRISH_LEAVE_INFO: Record<string, string> = {
  annual: 'Organisation of Working Time Act 1997: minimum 20 days statutory annual leave.',
  sick: `Sick Leave Act 2022: ${irishSickLeaveEntitlement(new Date().getFullYear())} statutory sick days in ${new Date().getFullYear()}, paid at 70% of normal daily wage (max €110/day). Doctor's note required for 3+ consecutive days.`,
  force_majeure: 'Force Majeure: Up to 3 days per year for urgent family emergencies (Organisation of Working Time Act 1997).',
  maternity: 'Maternity Protection Act: 26 weeks paid maternity leave.',
  paternity: 'Paternity Leave and Benefit Act 2016: 2 weeks paternity leave.',
  parents: "Parent's Leave and Benefit Act 2019: 9 weeks parent's leave.",
};

interface AddLeaveForm {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  admin_notes: string;
}

export default function LeaveTab({ profile, employeeProfile, leaveRequests: initial }: Props) {
  const [leaves, setLeaves] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState<string | null>(null);
  const [form, setForm] = useState<AddLeaveForm>({
    leave_type: 'annual', start_date: '', end_date: '', reason: '', admin_notes: '',
  });

  const supabase = createClient();
  const currentYear = new Date().getFullYear();

  // Calculate days used this year
  const annualUsed = leaves.filter(l =>
    l.leave_type === 'annual' && l.status === 'approved' &&
    l.start_date >= `${currentYear}-01-01`
  ).reduce((s, l) => s + l.days_requested, 0);

  const sickUsed = leaves.filter(l =>
    l.leave_type === 'sick' && l.status === 'approved' &&
    l.start_date >= `${currentYear}-01-01`
  ).reduce((s, l) => s + l.days_requested, 0);

  const annualEntitlement = employeeProfile?.annual_leave_entitlement ?? 20;
  const sickEntitlement = irishSickLeaveEntitlement(currentYear);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAdd = async () => {
    if (!form.start_date || !form.end_date) return;
    setSaving(true);
    const days = workingDaysBetween(form.start_date, form.end_date);
    const { data, error } = await supabase.from('leave_requests').insert({
      employee_id: profile.id,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      days_requested: days,
      status: 'approved', // admin-added leave is auto-approved
      reason: form.reason || null,
      admin_notes: form.admin_notes || null,
      reviewed_by: null,
      reviewed_at: new Date().toISOString(),
    }).select().maybeSingle();

    if (!error && data) {
      setLeaves(prev => [data as LeaveRequest, ...prev]);
    }
    setForm({ leave_type: 'annual', start_date: '', end_date: '', reason: '', admin_notes: '' });
    setShowAdd(false);
    setSaving(false);
  };

  const updateStatus = async (id: string, status: 'approved' | 'rejected', employeeId: string) => {
    setProcessing(id);
    await supabase.from('leave_requests').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    await supabase.from('notifications').insert({
      user_id: employeeId,
      type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
      title: `Leave request ${status}`,
      message: `Your leave request has been ${status}.`,
    });
    setProcessing(null);
  };

  return (
    <div className="space-y-4">
      {/* Entitlement Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Annual Entitlement', value: `${annualEntitlement} days`, sub: 'Per year', info: 'annual' },
          { label: 'Annual Used', value: `${annualUsed} days`, sub: `${annualEntitlement - annualUsed} remaining` },
          { label: 'Sick Entitlement', value: `${sickEntitlement} days`, sub: `Statutory ${currentYear}`, info: 'sick' },
          { label: 'Sick Days Used', value: `${sickUsed} days`, sub: `${sickEntitlement - sickUsed} remaining` },
        ].map(({ label, value, sub, info }) => (
          <div key={label} className="glass-card p-4 relative">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              {label}
              {info && (
                <button onClick={() => setShowInfo(showInfo === info ? null : info)}
                  className="text-slate-300 hover:text-slate-500 transition-colors">
                  <Info size={10} />
                </button>
              )}
            </p>
            <p className="text-xl font-bold text-[#0F172A]">{value}</p>
            <p className="text-xs text-slate-400">{sub}</p>
            {showInfo === info && info && IRISH_LEAVE_INFO[info] && (
              <div className="absolute top-full left-0 z-10 mt-1 w-72 glass-card p-3 text-xs text-slate-600 shadow-lg">
                <p className="font-semibold text-[#1B3A6B] mb-1">IE Employment Law</p>
                {IRISH_LEAVE_INFO[info]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Leave */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#0F172A]">Leave History</h3>
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1B3A6B] bg-[#1B3A6B]/8 rounded-lg hover:bg-[#1B3A6B]/15 transition-colors">
            <Plus size={12} /> Add Leave
          </button>
        </div>

        {showAdd && (
          <div className="mb-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Type</label>
                <select name="leave_type" value={form.leave_type} onChange={handleChange}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white/70 px-3 text-sm focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 focus:outline-none">
                  {Object.entries(LEAVE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
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
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Admin Notes (optional)</label>
              <input type="text" name="admin_notes" value={form.admin_notes} onChange={handleChange} placeholder="e.g. Approved verbally on..."
                className="w-full h-10 rounded-xl border border-slate-200 bg-white/70 px-3 text-sm focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !form.start_date || !form.end_date}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1B3A6B] rounded-lg hover:bg-[#1B3A6B]/90 disabled:opacity-50">
                {saving ? 'Adding…' : 'Add Leave'}
              </button>
            </div>
          </div>
        )}

        {leaves.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No leave requests on record.</p>
        ) : (
          <div className="space-y-2">
            {leaves.map(lr => (
              <div key={lr.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[#0F172A]">{LEAVE_LABELS[lr.leave_type] ?? lr.leave_type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_COLORS[lr.status] ?? ''}`}>
                      {lr.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDate(lr.start_date)} – {formatDate(lr.end_date)} · {lr.days_requested} {lr.days_requested === 1 ? 'day' : 'days'}
                  </p>
                  {lr.reason && <p className="text-xs text-slate-400 mt-0.5">{lr.reason}</p>}
                  {lr.admin_notes && <p className="text-xs text-slate-400 italic mt-0.5">Note: {lr.admin_notes}</p>}
                </div>
                {lr.status === 'pending' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => updateStatus(lr.id, 'approved', lr.employee_id)} disabled={processing === lr.id}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50">
                      <Check size={10} /> Approve
                    </button>
                    <button onClick={() => updateStatus(lr.id, 'rejected', lr.employee_id)} disabled={processing === lr.id}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                      <X size={10} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
