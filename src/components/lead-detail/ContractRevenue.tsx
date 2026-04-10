'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatEuro } from '@/lib/utils';
import { parseISO, format } from 'date-fns';
import { monthsBetween } from '@/lib/contractRevenue';

interface Phase {
  localId: string;
  id?: string;
  monthly_price: string;
  start_date: string;
  end_date: string;
}

interface ContractRevenueProps {
  leadId: string;
}

let _phaseCounter = 0;
function newPhase(): Phase {
  return { localId: `p_${++_phaseCounter}`, monthly_price: '', start_date: '', end_date: '' };
}

export default function ContractRevenue({ leadId }: ContractRevenueProps) {
  const supabaseRef = useRef(createClient());
  const isMounted = useRef(true);

  const [contractId, setContractId] = useState<string | null>(null);
  const [onboardingFee, setOnboardingFee] = useState('');
  const [paymentType, setPaymentType] = useState<'monthly' | 'upfront'>('monthly');
  const [phases, setPhases] = useState<Phase[]>([newPhase()]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loaded, setLoaded] = useState(false);

  // Track mount state to avoid state updates after unmount
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Keep a ref to current state so the stable save() callback can read latest values
  const stateRef = useRef({ onboardingFee, paymentType, phases, contractId });
  stateRef.current = { onboardingFee, paymentType, phases, contractId };

  // Load existing contract on mount
  useEffect(() => {
    const load = async () => {
      const sb = supabaseRef.current;
      const { data: contract } = await sb
        .from('contracts')
        .select('*, phases:contract_phases(*)')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (contract) {
        setContractId(contract.id);
        setOnboardingFee(contract.onboarding_fee != null ? String(contract.onboarding_fee) : '');
        setPaymentType(contract.payment_type ?? 'monthly');
        const loaded = (contract.phases ?? []) as Array<{ id: string; monthly_price: number; start_date: string; end_date: string }>;
        if (loaded.length > 0) {
          setPhases(loaded
            .sort((a, b) => a.start_date.localeCompare(b.start_date))
            .map(p => ({
              localId: p.id,
              id: p.id,
              monthly_price: String(p.monthly_price ?? ''),
              start_date: p.start_date ?? '',
              end_date: p.end_date ?? '',
            })));
        }
      }
      setLoaded(true);
    };
    load();
  }, [leadId]);

  // Stable save function reads current state via ref
  const save = useCallback(async () => {
    const sb = supabaseRef.current;
    const { onboardingFee: fee, paymentType: pt, phases: ps } = stateRef.current;
    let { contractId: cid } = stateRef.current;

    const feeNum = fee ? Number(fee) : null;

    if (!cid) {
      const { data } = await sb
        .from('contracts')
        .insert({ lead_id: leadId, onboarding_fee: feeNum, payment_type: pt })
        .select('id')
        .single();
      if (!data) { setSaveStatus('idle'); return; }
      cid = data.id;
      setContractId(cid);
      stateRef.current.contractId = cid;
    } else {
      await sb
        .from('contracts')
        .update({ onboarding_fee: feeNum, payment_type: pt, updated_at: new Date().toISOString() })
        .eq('id', cid);
    }

    // Delete all phases and re-insert (simplest correct approach)
    await sb.from('contract_phases').delete().eq('contract_id', cid);
    const validPhases = ps.filter(p => p.monthly_price && p.start_date && p.end_date);
    if (validPhases.length > 0) {
      await sb.from('contract_phases').insert(
        validPhases.map(p => ({
          contract_id: cid,
          monthly_price: Number(p.monthly_price),
          start_date: p.start_date,
          end_date: p.end_date,
        }))
      );
    }

    if (isMounted.current) {
      setSaveStatus('saved');
      setTimeout(() => { if (isMounted.current) setSaveStatus('idle'); }, 2000);
    }
  }, [leadId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save: fires 800ms after any data change.
  // `save` is intentionally omitted from deps — it's a stable useCallback([leadId]).
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!loaded) return;
    if (isMounted.current) setSaveStatus('saving');
    const timer = setTimeout(() => { save(); }, 800);
    return () => clearTimeout(timer);
  }, [onboardingFee, paymentType, phases, loaded]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // ── Derived calculations ──────────────────────────────────────────
  const fee = Number(onboardingFee) || 0;
  const totalMonthlyRevenue = phases.reduce((sum, p) => {
    const price = Number(p.monthly_price) || 0;
    const months = monthsBetween(p.start_date, p.end_date);
    return sum + price * months;
  }, 0);
  const totalContractValue = fee + totalMonthlyRevenue;

  const addPhase = () => setPhases(ps => [...ps, newPhase()]);
  const removePhase = (localId: string) => setPhases(ps => ps.filter(p => p.localId !== localId));
  const updatePhase = (localId: string, key: keyof Omit<Phase, 'localId' | 'id'>, val: string) =>
    setPhases(ps => ps.map(p => p.localId === localId ? { ...p, [key]: val } : p));

  if (!loaded) return null;

  return (
    <div className="glass-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-600 text-lg font-bold leading-none">€</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Contract Revenue</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Configure pricing phases and payment terms</p>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {saveStatus === 'saving' && (
            <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-slate-400">Saving...</motion.span>
          )}
          {saveStatus === 'saved' && (
            <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <Check size={12} /> Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Onboarding Fee */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Onboarding Fee (€)</label>
        <div className="relative max-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">€</span>
          <input
            type="number"
            min="0"
            value={onboardingFee}
            onChange={e => setOnboardingFee(e.target.value)}
            placeholder="0"
            className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30"
          />
        </div>
      </div>

      {/* Pricing Phases */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-3">Pricing Phases</p>

        {/* Column headers */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_140px_140px_32px] gap-2 mb-1.5 px-0.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Monthly Price (€)</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Start Date</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">End Date</span>
          <span />
        </div>

        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {phases.map((phase, idx) => (
              <motion.div
                key={phase.localId}
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.18 }}
              >
                <div className="sm:grid sm:grid-cols-[1fr_140px_140px_32px] gap-2 flex flex-col items-stretch">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">€</span>
                    <input
                      type="number"
                      min="0"
                      value={phase.monthly_price}
                      onChange={e => updatePhase(phase.localId, 'monthly_price', e.target.value)}
                      placeholder="Monthly price"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30"
                    />
                  </div>
                  <input
                    type="date"
                    value={phase.start_date}
                    onChange={e => updatePhase(phase.localId, 'start_date', e.target.value)}
                    className="px-3 py-2 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30"
                  />
                  <input
                    type="date"
                    value={phase.end_date}
                    onChange={e => updatePhase(phase.localId, 'end_date', e.target.value)}
                    className="px-3 py-2 rounded-xl border border-white/80 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30"
                  />
                  <button
                    onClick={() => removePhase(phase.localId)}
                    disabled={phases.length === 1}
                    className="h-9 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed self-center"
                    title="Remove phase"
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* Per-phase subtotal */}
                {phase.start_date && phase.end_date && Number(phase.monthly_price) > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1 ml-0.5">
                    Phase {idx + 1}: {monthsBetween(phase.start_date, phase.end_date)} month{monthsBetween(phase.start_date, phase.end_date) !== 1 ? 's' : ''} × {formatEuro(Number(phase.monthly_price))} = <span className="font-semibold text-slate-500">{formatEuro(monthsBetween(phase.start_date, phase.end_date) * Number(phase.monthly_price))}</span>
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button
          onClick={addPhase}
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#1B3A6B] hover:text-[#152E55] transition-colors"
        >
          <Plus size={13} /> Add Pricing Phase
        </button>
      </div>

      {/* Payment Type toggle */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Payment Type</p>
        <div className="flex gap-2">
          {(['monthly', 'upfront'] as const).map(type => (
            <button
              key={type}
              onClick={() => setPaymentType(type)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                paymentType === type
                  ? 'bg-[#1B3A6B] text-white border-[#1B3A6B] shadow-sm'
                  : 'bg-white/60 text-slate-600 border-white/80 hover:border-slate-300'
              }`}
            >
              {type === 'monthly' ? 'Pay Monthly' : 'Pay Upfront'}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="rounded-xl bg-white/50 border border-white/80 p-4 space-y-2.5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Revenue Summary</p>

        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">Onboarding Fee</span>
          <span className="text-sm font-semibold text-[#0F172A]">{formatEuro(fee)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">Total Monthly Revenue</span>
          <span className="text-sm font-semibold text-[#0F172A]">{formatEuro(totalMonthlyRevenue)}</span>
        </div>
        <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center">
          <span className="text-sm font-bold text-[#0F172A]">Total Contract Value</span>
          <span className="text-base font-bold text-[#1B3A6B]">{formatEuro(totalContractValue)}</span>
        </div>

        {/* Payment-type-specific view */}
        <AnimatePresence mode="wait">
          {paymentType === 'upfront' ? (
            <motion.div
              key="upfront"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-1 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Upfront Payment Due</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Full amount billed at contract start</p>
              </div>
              <span className="text-xl font-bold text-emerald-700">{formatEuro(totalContractValue)}</span>
            </motion.div>
          ) : (
            <motion.div
              key="monthly"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-1 space-y-2"
            >
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Monthly Revenue Timeline</p>
              {phases.filter(p => p.monthly_price && p.start_date && p.end_date && Number(p.monthly_price) > 0).length === 0 ? (
                <p className="text-xs text-slate-400 py-1">Add pricing phases above to see a breakdown</p>
              ) : (
                <div className="space-y-1.5">
                  {phases
                    .filter(p => p.monthly_price && p.start_date && p.end_date && Number(p.monthly_price) > 0)
                    .map((p, i) => {
                      const months = monthsBetween(p.start_date, p.end_date);
                      return (
                        <div key={p.localId} className="flex items-center justify-between p-2.5 rounded-lg bg-white/60 border border-slate-100">
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Phase {i + 1}</span>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {p.start_date ? format(parseISO(p.start_date), 'dd/MM/yyyy') : '—'} → {p.end_date ? format(parseISO(p.end_date), 'dd/MM/yyyy') : '—'}
                              <span className="text-slate-400"> · {months} mo</span>
                            </p>
                          </div>
                          <span className="text-sm font-bold text-[#1B3A6B]">{formatEuro(Number(p.monthly_price))}<span className="text-xs font-normal text-slate-400">/mo</span></span>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

