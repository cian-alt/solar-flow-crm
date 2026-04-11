'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, DollarSign, TrendingUp, CalendarClock, ChevronRight, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatEuro, formatDate } from '@/lib/utils';
import type { Profile, EmployeeProfile, LeaveRequest, PayrollRecord } from '@/types/database';

interface EmployeeRow {
  profile: Profile;
  employeeProfile: EmployeeProfile | null;
  commissionsThisMonth: number;
}

interface Summary {
  headcount: number;
  totalMonthlyPayroll: number;
  outstandingCommissions: number;
  pendingLeaveCount: number;
}

interface Props {
  employees: EmployeeRow[];
  pendingLeaves: LeaveRequest[];
  payrollRecords: PayrollRecord[];
  summary: Summary;
}

const LEAVE_LABELS: Record<string, string> = {
  annual: 'Annual', sick: 'Sick', unpaid: 'Unpaid',
  maternity: 'Maternity', paternity: 'Paternity', parents: "Parent's",
  force_majeure: 'Force Majeure', compassionate: 'Compassionate',
};

function SummaryCard({ label, value, sub, icon, accent, index }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; accent: string; index: number;
}) {
  return (
    <motion.div
      className="glass-card p-5 flex flex-col gap-3"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: accent + '1a' }}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[#0F172A] tabular-nums leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function HROverviewClient({ employees, pendingLeaves: initialLeaves, payrollRecords, summary }: Props) {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [processing, setProcessing] = useState<string | null>(null);
  const supabase = createClient();

  const handleLeave = async (id: string, status: 'approved' | 'rejected', employeeId: string) => {
    setProcessing(id);
    const { error } = await supabase
      .from('leave_requests')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setLeaves(prev => prev.filter(l => l.id !== id));
      // Notify employee
      await supabase.from('notifications').insert({
        user_id: employeeId,
        type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
        title: `Leave request ${status}`,
        message: `Your leave request has been ${status}.`,
      });
    }
    setProcessing(null);
  };

  const payrollStatusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    approved: 'bg-amber-50 text-amber-700',
    paid: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">HR Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">{new Date().toLocaleDateString('en-IE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Headcount" value={String(summary.headcount)} sub="Active employees"
          icon={<Users size={18} style={{ color: '#1B3A6B' }} />} accent="#1B3A6B" index={0} />
        <SummaryCard label="Monthly Payroll" value={formatEuro(summary.totalMonthlyPayroll)} sub="Base salary total"
          icon={<DollarSign size={18} style={{ color: '#059669' }} />} accent="#059669" index={1} />
        <SummaryCard label="Commissions Due" value={formatEuro(summary.outstandingCommissions)} sub="Unpaid this month"
          icon={<TrendingUp size={18} style={{ color: '#D97706' }} />} accent="#D97706" index={2} />
        <SummaryCard
          label="Pending Leave"
          value={String(summary.pendingLeaveCount)}
          sub={summary.pendingLeaveCount > 0 ? 'Needs review' : 'All clear'}
          icon={<CalendarClock size={18} style={{ color: '#DC2626' }} />}
          accent="#DC2626"
          index={3}
        />
      </div>

      {/* Employee Grid */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Team</h2>
        {employees.length === 0 ? (
          <div className="glass-card p-12 flex flex-col items-center gap-2 text-center">
            <Users className="w-8 h-8 text-slate-300" />
            <p className="font-semibold text-slate-600">No employees yet</p>
            <p className="text-sm text-slate-400">Profiles will appear here once employees are added.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {employees.map((emp, i) => (
              <motion.div key={emp.profile.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}>
                <Link href={`/hr/${emp.profile.id}`}
                  className="glass-card p-4 flex items-center gap-4 hover:shadow-md transition-shadow group block">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                    style={{ background: '#1B3A6B' }}>
                    {emp.profile.avatar_initials ?? emp.profile.full_name?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#0F172A] truncate">{emp.profile.full_name ?? emp.profile.email}</p>
                    <p className="text-xs text-slate-400 truncate">{emp.employeeProfile?.job_title ?? emp.profile.role_title ?? 'No title'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {emp.employeeProfile?.base_salary && (
                        <span className="text-xs text-slate-500">{formatEuro(emp.employeeProfile.base_salary)}/yr</span>
                      )}
                      {emp.commissionsThisMonth > 0 && (
                        <span className="text-xs font-semibold text-emerald-600">+{formatEuro(emp.commissionsThisMonth)}</span>
                      )}
                    </div>
                    {emp.employeeProfile?.start_date && (
                      <p className="text-[11px] text-slate-400 mt-0.5">Since {formatDate(emp.employeeProfile.start_date)}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Leave Requests */}
      {leaves.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Pending Leave Requests</h2>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {leaves.length}
            </span>
          </div>
          <div className="glass-card divide-y divide-white/60">
            {leaves.map((lr) => {
              const emp = lr.employee as { id: string; full_name: string | null; avatar_initials: string | null } | undefined;
              return (
                <div key={lr.id} className="flex items-center gap-4 p-4">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                    style={{ background: '#D97706' }}>
                    {emp?.avatar_initials ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A]">{emp?.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-slate-500">
                      {LEAVE_LABELS[lr.leave_type] ?? lr.leave_type} · {formatDate(lr.start_date)} – {formatDate(lr.end_date)} · {lr.days_requested} {lr.days_requested === 1 ? 'day' : 'days'}
                    </p>
                    {lr.reason && <p className="text-xs text-slate-400 mt-0.5 truncate">{lr.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleLeave(lr.id, 'approved', lr.employee_id)}
                      disabled={processing === lr.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50">
                      <Check size={12} /> Approve
                    </button>
                    <button
                      onClick={() => handleLeave(lr.id, 'rejected', lr.employee_id)}
                      disabled={processing === lr.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                      <X size={12} /> Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payroll Summary */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">This Month&apos;s Payroll</h2>
        {payrollRecords.length === 0 ? (
          <div className="glass-card p-8 flex flex-col items-center gap-2 text-center">
            <DollarSign className="w-7 h-7 text-slate-300" />
            <p className="text-sm text-slate-500">No payroll records generated yet</p>
            <p className="text-xs text-slate-400">Open an employee profile and click &ldquo;Generate Payroll&rdquo;.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Employee', 'Base Salary', 'Onboarding Comm.', 'Retention Comm.', 'Gross Total', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payrollRecords.map((pr) => {
                    const emp = pr.employee as { id: string; full_name: string | null } | undefined;
                    return (
                      <tr key={pr.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-[#0F172A]">{emp?.full_name ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{formatEuro(pr.base_salary_portion)}</td>
                        <td className="px-4 py-3 text-emerald-600 font-medium">{formatEuro(pr.onboarding_commission)}</td>
                        <td className="px-4 py-3 text-emerald-600 font-medium">{formatEuro(pr.retention_commission)}</td>
                        <td className="px-4 py-3 font-semibold text-[#0F172A]">{formatEuro(pr.total_gross)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${payrollStatusColors[pr.status] ?? ''}`}>
                            {pr.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
