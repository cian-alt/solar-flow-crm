'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { Profile, LeadStage, LeadSource, CompanySize } from '@/types/database';
import { STAGE_ORDER, calculateLeadScore } from '@/lib/utils';
import toast from 'react-hot-toast';

interface AddLeadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  onLeadAdded: () => void;
}

const SOURCES: LeadSource[] = ['Website','Referral','Cold Call','LinkedIn','Trade Show','Google Ads','Facebook Ads','Partner','Other'];
const SIZES: CompanySize[] = ['1-10','11-50','51-200','201-500','500+'];

interface FormData {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  eircode: string;
  company_size: string;
  deal_value: string;
  system_size_kw: string;
  lead_source: string;
  stage: LeadStage;
  assigned_to: string;
  follow_up_date: string;
}

export default function AddLeadDrawer({ isOpen, onClose, profiles, onLeadAdded }: AddLeadDrawerProps) {
  const supabase = createClient();
  const [form, setForm] = useState<FormData>({
    company_name: '', contact_name: '', email: '', phone: '',
    address: '', eircode: '', company_size: '', deal_value: '',
    system_size_kw: '', lead_source: '', stage: 'New Lead',
    assigned_to: '', follow_up_date: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormData, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const errs: Partial<FormData> = {};
    if (!form.company_name.trim()) errs.company_name = 'Required';
    if (!form.contact_name.trim()) errs.contact_name = 'Required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    return errs;
  };

  const checkDuplicate = async (): Promise<string | null> => {
    const checks = [];
    if (form.company_name.trim()) {
      checks.push(supabase.from('leads').select('id,company_name').ilike('company_name', form.company_name.trim()).single());
    }
    for (const check of checks) {
      const { data } = await check;
      if (data) return data.company_name;
    }
    return null;
  };

  const submit = async (force = false) => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    if (!force) {
      const dup = await checkDuplicate();
      if (dup) { setDuplicate(dup); return; }
    }

    setSaving(true);
    try {
      const score = calculateLeadScore({
        deal_value: form.deal_value ? Number(form.deal_value) : null,
        stage: form.stage,
        follow_up_date: form.follow_up_date || null,
        has_calls: false,
        has_documents: false,
        has_notes: false,
      });

      const { data: lead, error } = await supabase.from('leads').insert({
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        eircode: form.eircode || null,
        company_size: form.company_size || null,
        deal_value: form.deal_value ? Number(form.deal_value) : null,
        system_size_kw: form.system_size_kw ? Number(form.system_size_kw) : null,
        lead_source: form.lead_source || null,
        stage: form.stage,
        assigned_to: form.assigned_to || null,
        follow_up_date: form.follow_up_date || null,
        lead_score: score,
      }).select().single();

      if (error) throw error;

      // Log creation activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user && lead) {
        await supabase.from('activities').insert({
          lead_id: lead.id, user_id: user.id,
          type: 'created', description: 'Lead created',
          metadata: {},
        });
      }

      toast.success('Lead added successfully');
      onLeadAdded();
      onClose();
      resetForm();
    } catch {
      toast.error('Failed to add lead');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({ company_name: '', contact_name: '', email: '', phone: '',
      address: '', eircode: '', company_size: '', deal_value: '',
      system_size_kw: '', lead_source: '', stage: 'New Lead',
      assigned_to: '', follow_up_date: '' });
    setErrors({});
    setDuplicate(null);
  };

  const Field = ({ label, k, type = 'text', placeholder }: { label: string; k: keyof FormData; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder}
        className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30 transition-all
          ${errors[k] ? 'border-red-300 bg-red-50' : 'border-white/80 bg-white/60'}`} />
      {errors[k] && <p className="text-xs text-red-500 mt-1">{errors[k]}</p>}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-[480px] z-50 flex flex-col"
            style={{ background: 'rgba(248,250,255,0.97)', backdropFilter: 'blur(24px)', borderLeft: '1px solid rgba(255,255,255,0.8)', boxShadow: '-8px 0 40px rgba(31,38,135,0.12)' }}>

            {/* Header */}
            <div className="px-6 py-5 border-b border-white/60 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0F172A]">Add New Lead</h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
                <X size={18} />
              </button>
            </div>

            {/* Duplicate warning */}
            {duplicate && (
              <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Duplicate detected</p>
                  <p className="text-xs text-amber-700 mt-0.5">A lead for &ldquo;<strong>{duplicate}</strong>&rdquo; already exists.</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => submit(true)}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                      Add Anyway
                    </button>
                    <button onClick={() => setDuplicate(null)}
                      className="px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Company Name *" k="company_name" placeholder="Acme Solar Ltd" />
                <Field label="Contact Name *" k="contact_name" placeholder="John Murphy" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email" k="email" type="email" placeholder="john@acme.ie" />
                <Field label="Phone" k="phone" type="tel" placeholder="+353 1 234 5678" />
              </div>
              <Field label="Address" k="address" placeholder="123 Main Street, Dublin" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Eircode" k="eircode" placeholder="D01 F5P2" />
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Company Size</label>
                  <select value={form.company_size} onChange={e => set('company_size', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30">
                    <option value="">Select size</option>
                    {SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Deal Value (€)" k="deal_value" type="number" placeholder="50000" />
                <Field label="System Size (kW)" k="system_size_kw" type="number" placeholder="25" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lead Source</label>
                  <select value={form.lead_source} onChange={e => set('lead_source', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30">
                    <option value="">Select source</option>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Stage</label>
                  <select value={form.stage} onChange={e => set('stage', e.target.value as LeadStage)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30">
                    {STAGE_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned To</label>
                  <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30">
                    <option value="">Unassigned</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>)}
                  </select>
                </div>
                <Field label="Follow-up Date" k="follow_up_date" type="date" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/60 flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => submit(false)} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#1B3A6B] text-white text-sm font-semibold hover:bg-[#152E55] transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Lead'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
