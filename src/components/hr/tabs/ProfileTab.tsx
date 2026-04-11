'use client';

import { useState } from 'react';
import { Eye, EyeOff, Save, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type { Profile, EmployeeProfile } from '@/types/database';

interface Props {
  profile: Profile;
  employeeProfile: EmployeeProfile | null;
  onSaved: (ep: EmployeeProfile) => void;
}

type FormState = {
  full_name: string;
  role_title: string;
  job_title: string;
  department: string;
  start_date: string;
  employee_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  iban: string;
};

function InfoRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-[#0F172A]">{value || '—'}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', hint }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full h-10 rounded-xl border border-slate-200 bg-white/70 px-3 text-sm text-slate-800 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 focus:outline-none transition-all"
      />
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function ProfileTab({ profile, employeeProfile, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ibanVisible, setIbanVisible] = useState(false);
  const [form, setForm] = useState<FormState>({
    full_name: profile.full_name ?? '',
    role_title: profile.role_title ?? '',
    job_title: employeeProfile?.job_title ?? '',
    department: employeeProfile?.department ?? 'Sales',
    start_date: employeeProfile?.start_date ?? '',
    employee_number: employeeProfile?.employee_number ?? '',
    emergency_contact_name: employeeProfile?.emergency_contact_name ?? '',
    emergency_contact_phone: employeeProfile?.emergency_contact_phone ?? '',
    iban: employeeProfile?.iban ?? '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    await supabase.from('profiles').update({
      full_name: form.full_name,
      role_title: form.role_title,
    }).eq('id', profile.id);

    const epData = {
      id: profile.id,
      employee_number: form.employee_number || `SF-${Date.now().toString().slice(-3)}`,
      job_title: form.job_title || null,
      department: form.department || 'Sales',
      start_date: form.start_date || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      iban: form.iban || null,
    };

    const { data, error } = await supabase
      .from('employee_profiles')
      .upsert(epData, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (!error && data) {
      onSaved(data as EmployeeProfile);
    }

    setSaving(false);
    setEditing(false);
  };

  const maskedIban = form.iban
    ? form.iban.replace(/(.{4})/g, '$1 ').trim().replace(/.(?=.{4})/g, '•')
    : '';

  return (
    <div className="space-y-4">
      {/* Personal Details */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#0F172A]">Personal Details</h3>
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1B3A6B] bg-[#1B3A6B]/8 rounded-lg hover:bg-[#1B3A6B]/15 transition-colors">
              <Pencil size={12} /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1B3A6B] rounded-lg hover:bg-[#1B3A6B]/90 transition-colors disabled:opacity-60">
                <Save size={12} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} />
            <Field label="Job Title" name="job_title" value={form.job_title} onChange={handleChange} />
            <Field label="Role Title" name="role_title" value={form.role_title} onChange={handleChange} />
            <Field label="Department" name="department" value={form.department} onChange={handleChange} />
            <Field label="Employee Number" name="employee_number" value={form.employee_number} onChange={handleChange}
              hint="Auto-generated if left blank (e.g. SF-001)" />
            <Field label="Start Date" name="start_date" value={form.start_date} onChange={handleChange} type="date" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow label="Full Name" value={profile.full_name ?? ''} />
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Job Title" value={employeeProfile?.job_title ?? ''} />
            <InfoRow label="Department" value={employeeProfile?.department ?? 'Sales'} />
            <InfoRow label="Employee #" value={employeeProfile?.employee_number ?? ''} />
            <InfoRow label="Start Date" value={employeeProfile?.start_date ? formatDate(employeeProfile.start_date) : ''} />
          </div>
        )}
      </div>

      {/* Emergency Contact */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Emergency Contact</h3>
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact Name" name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} />
            <Field label="Contact Phone" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} type="tel" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow label="Contact Name" value={employeeProfile?.emergency_contact_name ?? ''} />
            <InfoRow label="Contact Phone" value={employeeProfile?.emergency_contact_phone ?? ''} />
          </div>
        )}
      </div>

      {/* IBAN */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Payroll Bank Details</h3>
        {editing ? (
          <Field label="IBAN" name="iban" value={form.iban} onChange={handleChange}
            hint="Stored securely for payroll. Visible to admins only." />
        ) : (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">IBAN</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono text-[#0F172A]">
                {form.iban ? (ibanVisible ? form.iban : maskedIban) : '—'}
              </p>
              {form.iban && (
                <button onClick={() => setIbanVisible(v => !v)}
                  className="text-slate-400 hover:text-slate-600 transition-colors">
                  {ibanVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Click the eye icon to reveal · Admin only</p>
          </div>
        )}
      </div>
    </div>
  );
}
