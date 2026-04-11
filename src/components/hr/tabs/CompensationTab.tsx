'use client';

import { useState } from 'react';
import { CheckCircle, Plus, Pencil, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatEuro, formatDate } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { Profile, EmployeeProfile, CommissionRecord, PayrollRecord } from '@/types/database';

interface Props {
  profile: Profile;
  employeeProfile: EmployeeProfile | null;
  commissions: CommissionRecord[];
  payrollRecords: PayrollRecord[];
}

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  retention: 'Retention',
};

export default function CompensationTab({ profile, employeeProfile: initialEp, commissions: initialCommissions, payrollRecords: initialPayroll }: Props) {
  const [ep, setEp] = useState(initialEp);
  const [commissions, setCommissions] = useState(initialCommissions);
  const [payroll, setPayroll] = useState(initialPayroll);
  const [editingSalary, setEditingSalary] = useState(false);
  const [baseSalary, setBaseSalary] = useState(String(initialEp?.base_salary ?? ''));
  const [onboardingRate, setOnboardingRate] = useState(String(initialEp?.onboarding_commission_rate ?? '40'));
  const [retentionRate, setRetentionRate] = useState(String(initialEp?.retention_commission_rate ?? '5'));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const supabase = createClient();

  const saveSalary = async () => {
    if (!ep) return;
    setSaving(true);
    const updates = {
      base_salary: parseFloat(baseSalary) || 0,
      onboarding_commission_rate: parseFloat(onboardingRate) || 40,
      retention_commission_rate: parseFloat(retentionRate) || 5,
    };
    await supabase.from('employee_profiles').update(updates).eq('id', profile.id);
    setEp(prev => prev ? { ...prev, ...updates } : prev);
    setSaving(false);
    setEditingSalary(false);
  };

  const markPaid = async (id: string) => {
    const now = new Date().toISOString();
    await supabase.from('commission_records').update({ is_paid: true, paid_at: now }).eq('id', id);
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, is_paid: true, paid_at: now } : c));
    // Notify employee
    await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'commission_paid',
      title: 'Commission paid',
      message: 'A commission record has been marked as paid.',
    });
  };

  const generatePayroll = async () => {
    if (!ep?.base_salary) return;
    setGenerating(true);
    const today = new Date();
    const periodStart = format(startOfMonth(today), 'yyyy-MM-dd');
    const periodEnd = format(endOfMonth(today), 'yyyy-MM-dd');
    const thisMonthStart = periodStart;

    const thisMonthCommissions = commissions.filter(c => c.month_year >= thisMonthStart);
    const onboardingComm = thisMonthCommissions
      .filter(c => c.commission_type === 'onboarding')
      .reduce((s, c) => s + c.amount, 0);
    const retentionComm = thisMonthCommissions
      .filter(c => c.commission_type === 'retention')
      .reduce((s, c) => s + c.amount, 0);
    const base = ep.base_salary / 12;
    const gross = base + onboardingComm + retentionComm;

    const { data } = await supabase.from('payroll_records').insert({
      employee_id: profile.id,
      period_start: periodStart,
      period_end: periodEnd,
      base_salary_portion: base,
      onboarding_commission: onboardingComm,
      retention_commission: retentionComm,
      total_gross: gross,
      status: 'draft',
    }).select().maybeSingle();

    if (data) setPayroll(prev => [data as PayrollRecord, ...prev]);
    setGenerating(false);
  };

  const paidThisYear = commissions.filter(c => c.is_paid && c.month_year >= `${new Date().getFullYear()}-01-01`).reduce((s, c) => s + c.amount, 0);
  const outstanding = commissions.filter(c => !c.is_paid).reduce((s, c) => s + c.amount, 0);

  const payrollStatusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    approved: 'bg-amber-50 text-amber-700',
    paid: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <div className="space-y-4">
      {/* Salary Card */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#0F172A]">Compensation</h3>
          {!editingSalary ? (
            <button onClick={() => setEditingSalary(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1B3A6B] bg-[#1B3A6B]/8 rounded-lg hover:bg-[#1B3A6B]/15 transition-colors">
              <Pencil size={12} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditingSalary(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
              <button onClick={saveSalary} disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#1B3A6B] rounded-lg hover:bg-[#1B3A6B]/90 disabled:opacity-60">
                <Save size={12} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {editingSalary ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Annual Base Salary (€)</label>
              <input type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white/70 px-3 text-sm focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Onboarding Comm. Rate (%)</label>
              <input type="number" value={onboardingRate} onChange={e => setOnboardingRate(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white/70 px-3 text-sm focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Retention Comm. Rate (%)</label>
              <input type="number" value={retentionRate} onChange={e => setRetentionRate(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white/70 px-3 text-sm focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 focus:outline-none" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Annual Salary', value: formatEuro(ep?.base_salary ?? null) },
              { label: 'Monthly Salary', value: ep?.base_salary ? formatEuro(ep.base_salary / 12) : '—' },
              { label: 'Onboarding Rate', value: `${ep?.onboarding_commission_rate ?? 40}%` },
              { label: 'Retention Rate', value: `${ep?.retention_commission_rate ?? 5}%` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-lg font-bold text-[#0F172A]">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commission Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Paid This Year</p>
          <p className="text-xl font-bold text-emerald-600">{formatEuro(paidThisYear)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Outstanding</p>
          <p className="text-xl font-bold text-amber-600">{formatEuro(outstanding)}</p>
        </div>
      </div>

      {/* Commission History */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Commission History</h3>
        {commissions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No commission records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr>
                  {['Month', 'Company', 'Type', 'Amount', 'Status', ''].map(h => (
                    <th key={h} className="text-left pb-2 pr-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissions.map(c => {
                  const lead = c.lead as { id: string; company_name: string } | undefined;
                  return (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-3 text-slate-500 text-xs">{c.month_year ? format(new Date(c.month_year), 'MMM yyyy') : '—'}</td>
                      <td className="py-2.5 pr-3 text-slate-700">{lead?.company_name ?? '—'}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.commission_type === 'onboarding' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>
                          {COMMISSION_TYPE_LABELS[c.commission_type]}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-[#0F172A]">{formatEuro(c.amount)}</td>
                      <td className="py-2.5 pr-3">
                        {c.is_paid ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                            <CheckCircle size={11} /> Paid
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-600">Unpaid</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {!c.is_paid && (
                          <button onClick={() => markPaid(c.id)}
                            className="px-2 py-1 text-[10px] font-semibold text-[#1B3A6B] bg-[#1B3A6B]/8 rounded-lg hover:bg-[#1B3A6B]/15 transition-colors">
                            Mark Paid
                          </button>
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

      {/* Generate Payroll */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Payroll Records</h3>
            <p className="text-xs text-slate-400 mt-0.5">Generate a payroll record for the current month</p>
          </div>
          <button onClick={generatePayroll} disabled={generating || !ep?.base_salary}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#1B3A6B] rounded-lg hover:bg-[#1B3A6B]/90 transition-colors disabled:opacity-50">
            <Plus size={12} /> {generating ? 'Generating…' : 'Generate Payroll'}
          </button>
        </div>

        {payroll.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No payroll records generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr>
                  {['Period', 'Base', 'Commissions', 'Gross', 'Net', 'Status'].map(h => (
                    <th key={h} className="text-left pb-2 pr-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payroll.map(pr => (
                  <tr key={pr.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-3 text-slate-500 text-xs">{formatDate(pr.period_start)} – {formatDate(pr.period_end)}</td>
                    <td className="py-2.5 pr-3">{formatEuro(pr.base_salary_portion)}</td>
                    <td className="py-2.5 pr-3 text-emerald-600">{formatEuro(pr.onboarding_commission + pr.retention_commission)}</td>
                    <td className="py-2.5 pr-3 font-semibold">{formatEuro(pr.total_gross)}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{pr.total_net ? formatEuro(pr.total_net) : '—'}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${payrollStatusColors[pr.status] ?? ''}`}>
                        {pr.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
