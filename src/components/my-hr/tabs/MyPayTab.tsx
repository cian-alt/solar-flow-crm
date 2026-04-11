'use client';

import { CheckCircle } from 'lucide-react';
import { formatEuro, formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import type { Profile, EmployeeProfile, CommissionRecord, PayrollRecord } from '@/types/database';

interface Props {
  profile: Profile | null;
  employeeProfile: EmployeeProfile | null;
  commissions: CommissionRecord[];
  payrollRecords: PayrollRecord[];
}

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  onboarding: 'Onboarding', retention: 'Retention',
};

export default function MyPayTab({ employeeProfile, commissions, payrollRecords }: Props) {
  const currentYear = new Date().getFullYear();
  const currentMonthStart = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  const thisMonthCommissions = commissions.filter(c => c.month_year >= currentMonthStart);
  const onboardingThisMonth = thisMonthCommissions.filter(c => c.commission_type === 'onboarding').reduce((s, c) => s + c.amount, 0);
  const retentionThisMonth = thisMonthCommissions.filter(c => c.commission_type === 'retention').reduce((s, c) => s + c.amount, 0);
  const totalCommissionThisMonth = onboardingThisMonth + retentionThisMonth;

  const ytdSalary = employeeProfile?.base_salary
    ? (employeeProfile.base_salary / 12) * (new Date().getMonth() + 1)
    : 0;
  const ytdCommissions = commissions
    .filter(c => c.month_year >= `${currentYear}-01-01`)
    .reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-4">
      {/* Salary Summary */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-4">My Salary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Annual Salary</p>
            <p className="text-2xl font-bold text-[#0F172A]">{formatEuro(employeeProfile?.base_salary ?? null)}</p>
            <p className="text-xs text-slate-400 mt-0.5">per year</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Monthly Salary</p>
            <p className="text-2xl font-bold text-[#0F172A]">
              {employeeProfile?.base_salary ? formatEuro(employeeProfile.base_salary / 12) : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">per month</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">YTD Earnings</p>
            <p className="text-2xl font-bold text-emerald-600">{formatEuro(ytdSalary + ytdCommissions)}</p>
            <p className="text-xs text-slate-400 mt-0.5">salary + commissions</p>
          </div>
        </div>
      </div>

      {/* This Month's Commission */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-4">
          Commission — {format(new Date(), 'MMMM yyyy')}
        </h3>
        {thisMonthCommissions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No commission records for this month yet.</p>
        ) : (
          <div className="space-y-3">
            {onboardingThisMonth > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">Onboarding Commission</p>
                  <p className="text-xs text-slate-400">{employeeProfile?.onboarding_commission_rate ?? 40}% of onboarding + first month</p>
                </div>
                <p className="text-lg font-bold text-emerald-600">{formatEuro(onboardingThisMonth)}</p>
              </div>
            )}
            {retentionThisMonth > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">Retention Commission</p>
                  <p className="text-xs text-slate-400">{employeeProfile?.retention_commission_rate ?? 5}% of active monthly contracts</p>
                </div>
                <p className="text-lg font-bold text-emerald-600">{formatEuro(retentionThisMonth)}</p>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <p className="text-sm font-semibold text-[#0F172A]">Total Commission This Month</p>
              <p className="text-xl font-bold text-[#0F172A]">{formatEuro(totalCommissionThisMonth)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Commission History */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Commission History</h3>
        {commissions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No commission records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr>
                  {['Month', 'Company', 'Type', 'Amount', 'Status'].map(h => (
                    <th key={h} className="text-left pb-2 pr-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissions.map(c => {
                  const lead = c.lead as { id: string; company_name: string } | undefined;
                  return (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-4 text-slate-500 text-xs">
                        {c.month_year ? format(new Date(c.month_year), 'MMM yyyy') : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-700">{lead?.company_name ?? '—'}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.commission_type === 'onboarding' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>
                          {COMMISSION_TYPE_LABELS[c.commission_type] ?? c.commission_type}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-semibold text-[#0F172A]">{formatEuro(c.amount)}</td>
                      <td className="py-2.5">
                        {c.is_paid ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                            <CheckCircle size={11} /> Paid
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-600">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payslips */}
      {payrollRecords.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Payslip History</h3>
          <div className="space-y-2">
            {payrollRecords.map(pr => (
              <div key={pr.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(pr.period_start)} – {formatDate(pr.period_end)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Base {formatEuro(pr.base_salary_portion)} + Comm. {formatEuro(pr.onboarding_commission + pr.retention_commission)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#0F172A]">{formatEuro(pr.total_gross)}</p>
                  <span className={`text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded-full ${
                    pr.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : pr.status === 'approved' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                  }`}>{pr.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
