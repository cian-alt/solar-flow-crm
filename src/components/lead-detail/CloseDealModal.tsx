'use client';

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronRight, ChevronLeft, Plus, Sparkles, FileText } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import type { Lead, Contract, RecommendedPackage, OnboardingPackage, PaymentType } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { closeDeal, dealTotals, type DealPhase } from "@/lib/closeDeal";
import { monthsBetween } from "@/lib/contractRevenue";
import { SUBSCRIPTION_TIERS } from "@/lib/leadScoring";
import { PACKAGE_META } from "@/lib/onboarding";
import { cn, formatEuro } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";

interface Props {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (result: { contract?: Contract }) => void;
}

interface PhaseRow { localId: string; monthly: string; months: string; start: string; }

const SUB_PACKAGES: RecommendedPackage[] = ["Starter", "Professional", "Enterprise"];
const ONB_PACKAGES: OnboardingPackage[] = ["Basic", "Pro", "Premium"];
const todayStr = () => format(new Date(), "yyyy-MM-dd");
let _pc = 0;
const newPhase = (monthly = "", months = "", start = todayStr()): PhaseRow => ({ localId: `ph_${++_pc}`, monthly, months, start });

export default function CloseDealModal({ lead, isOpen, onClose, onCompleted }: Props) {
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Section 1 — subscription
  const [subPackage, setSubPackage] = useState<RecommendedPackage>("Professional");
  const [monthlyAmount, setMonthlyAmount] = useState("1100");
  const [subDiscount, setSubDiscount] = useState(false);
  const [subOriginal, setSubOriginal] = useState("1100");
  const [subReason, setSubReason] = useState("");
  const [duration, setDuration] = useState("12");
  const [startDate, setStartDate] = useState(todayStr());
  const [paymentType, setPaymentType] = useState<PaymentType>("monthly");
  const [phases, setPhases] = useState<PhaseRow[]>([newPhase("1100", "12")]);

  // Section 2 — onboarding
  const [onbPackage, setOnbPackage] = useState<OnboardingPackage>("Pro");
  const [onbFee, setOnbFee] = useState("1500");
  const [onbDiscount, setOnbDiscount] = useState(false);
  const [onbOriginal, setOnbOriginal] = useState("1500");
  const [onbReason, setOnbReason] = useState("");

  // Section 3 — client / SLA
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [eircode, setEircode] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [vat, setVat] = useState("");

  // Initialise when opened — prefer existing contract (edit), else AI recommendation + lead data.
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setLoading(true);
    (async () => {
      const { data: c } = await supabase.from("contracts").select("*, phases:contract_phases(*)").eq("lead_id", lead.id).maybeSingle<Contract>();
      const recSub: RecommendedPackage = (lead.recommended_package as RecommendedPackage) || "Professional";
      const recOnb: OnboardingPackage = (lead.recommended_onboarding as OnboardingPackage) || "Pro";

      if (c) {
        const sp = c.subscription_package ?? recSub;
        setSubPackage(sp);
        setMonthlyAmount(String(c.monthly_amount ?? SUBSCRIPTION_TIERS[sp].monthly));
        setSubDiscount(!!c.subscription_discount);
        setSubOriginal(String(c.subscription_original_amount ?? SUBSCRIPTION_TIERS[sp].monthly));
        setSubReason(c.subscription_discount_reason ?? "");
        setDuration(String(c.contract_duration_months ?? 12));
        setStartDate(c.start_date ?? todayStr());
        setPaymentType(c.payment_type ?? "monthly");
        const op = c.onboarding_package ?? recOnb;
        setOnbPackage(op);
        setOnbFee(String(c.onboarding_fee ?? PACKAGE_META[op].fee));
        setOnbDiscount(!!c.onboarding_discount);
        setOnbOriginal(String(c.onboarding_original_fee ?? PACKAGE_META[op].fee));
        setOnbReason(c.onboarding_discount_reason ?? "");
        setCompanyName(c.official_company_name ?? lead.company_name);
        setAddress(c.company_address ?? lead.address ?? "");
        setEircode(c.eircode ?? lead.eircode ?? "");
        setVat(c.vat_number ?? "");
        const ph = (c.phases ?? []).sort((a, b) => a.start_date.localeCompare(b.start_date));
        setPhases(ph.length ? ph.map((p) => newPhase(String(p.monthly_price), String(monthsBetween(p.start_date, p.end_date)), p.start_date)) : [newPhase(String(c.monthly_amount ?? SUBSCRIPTION_TIERS[sp].monthly), String(c.contract_duration_months ?? 12), c.start_date ?? todayStr())]);
      } else {
        setSubPackage(recSub); setMonthlyAmount(String(SUBSCRIPTION_TIERS[recSub].monthly)); setSubOriginal(String(SUBSCRIPTION_TIERS[recSub].monthly));
        setSubDiscount(false); setSubReason(""); setDuration("12"); setStartDate(todayStr()); setPaymentType("monthly");
        setOnbPackage(recOnb); setOnbFee(String(PACKAGE_META[recOnb].fee)); setOnbOriginal(String(PACKAGE_META[recOnb].fee)); setOnbDiscount(false); setOnbReason("");
        setPhases([newPhase(String(SUBSCRIPTION_TIERS[recSub].monthly), "12")]);
        setCompanyName(lead.company_name); setAddress(lead.address ?? ""); setEircode(lead.eircode ?? ""); setVat("");
      }
      setContactName(lead.contact_name ?? "");
      setContactEmail(lead.email ?? "");
      setContactPhone(lead.phone ?? "");
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lead.id]);

  // Keep phase 1 synced with the headline subscription fields.
  useEffect(() => {
    setPhases((ps) => ps.length ? ps.map((p, i) => (i === 0 ? { ...p, monthly: monthlyAmount, months: duration, start: startDate } : p)) : [newPhase(monthlyAmount, duration, startDate)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyAmount, duration, startDate]);

  const selectSub = (pkg: RecommendedPackage) => {
    setSubPackage(pkg);
    const price = SUBSCRIPTION_TIERS[pkg].monthly;
    setMonthlyAmount(String(price));
    setSubOriginal(String(price));
  };
  const selectOnb = (pkg: OnboardingPackage) => {
    setOnbPackage(pkg);
    setOnbFee(String(PACKAGE_META[pkg].fee));
    setOnbOriginal(String(PACKAGE_META[pkg].fee));
  };

  const toDealPhases = (): DealPhase[] => phases
    .filter((p) => Number(p.monthly) > 0 && Number(p.months) > 0 && p.start)
    .map((p) => {
      const months = Math.max(1, Number(p.months));
      const end = format(addMonths(parseISO(p.start), months - 1), "yyyy-MM-dd");
      return { monthly_price: Number(p.monthly), start_date: p.start, end_date: end };
    });

  const totals = useMemo(() => dealTotals({ phases: toDealPhases(), onboardingFee: Number(onbFee) || 0 }), [phases, onbFee]);
  const monthlyCommission = Math.round((Number(monthlyAmount) || 0) * 0.05);
  const onboardingCommission = Math.round((Number(onbFee) || 0) * 0.4);

  const submit = async (generateSla: boolean) => {
    if (!companyName.trim()) { toast.error("Company name is required"); setStep(3); return; }
    setSubmitting(true);
    const res = await closeDeal(supabase, {
      lead,
      subscriptionPackage: subPackage,
      monthlyAmount: Number(monthlyAmount) || 0,
      subscriptionDiscount: subDiscount,
      subscriptionOriginalAmount: subDiscount ? Number(subOriginal) || null : null,
      subscriptionDiscountReason: subDiscount ? subReason || null : null,
      contractDurationMonths: Number(duration) || 12,
      startDate,
      paymentType,
      phases: toDealPhases(),
      onboardingPackage: onbPackage,
      onboardingFee: Number(onbFee) || 0,
      onboardingDiscount: onbDiscount,
      onboardingOriginalFee: onbDiscount ? Number(onbOriginal) || null : null,
      onboardingDiscountReason: onbDiscount ? onbReason || null : null,
      client: { officialCompanyName: companyName.trim(), address, eircode, contactName, contactEmail, contactPhone, vatNumber: vat },
      generateSla,
    });
    setSubmitting(false);
    if (res.error) { toast.error(res.error.includes("does not exist") ? "Run the close-deal SQL migration first" : res.error); return; }
    onCompleted({ contract: res.contract });
    onClose();
    if (generateSla) {
      confetti({ particleCount: 180, spread: 80, origin: { y: 0.5 }, colors: ["#1B3A6B", "#059669", "#F59E0B"] });
      toast.success("🎉 Deal closed! SLA generated and onboarding created.");
    } else {
      toast.success("Saved as draft");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full sm:max-w-2xl h-full bg-[#F8FAFF] shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-[#1B3A6B] text-white flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-bold">Close Deal — {lead.company_name}</h2>
              <p className="text-xs text-white/70 mt-0.5">Step {step} of 3 · {step === 1 ? "Subscription Package" : step === 2 ? "Onboarding Package" : "Deal Summary"}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"><X size={20} /></button>
          </div>
          {/* Progress */}
          <div className="flex gap-1 px-6 py-2 bg-[#1B3A6B]/95 shrink-0">
            {[1, 2, 3].map((s) => <div key={s} className={cn("h-1 flex-1 rounded-full transition-colors", s <= step ? "bg-[#A78BFA]" : "bg-white/20")} />)}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  {step === 1 && (
                    <Section1
                      lead={lead} subPackage={subPackage} onSelect={selectSub}
                      monthlyAmount={monthlyAmount} setMonthlyAmount={setMonthlyAmount}
                      subDiscount={subDiscount} setSubDiscount={setSubDiscount}
                      subOriginal={subOriginal} setSubOriginal={setSubOriginal} subReason={subReason} setSubReason={setSubReason}
                      duration={duration} setDuration={setDuration} startDate={startDate} setStartDate={setStartDate}
                      paymentType={paymentType} setPaymentType={setPaymentType}
                      phases={phases} setPhases={setPhases}
                    />
                  )}
                  {step === 2 && (
                    <Section2 onbPackage={onbPackage} onSelect={selectOnb} onbFee={onbFee} setOnbFee={setOnbFee}
                      onbDiscount={onbDiscount} setOnbDiscount={setOnbDiscount} onbOriginal={onbOriginal} setOnbOriginal={setOnbOriginal}
                      onbReason={onbReason} setOnbReason={setOnbReason} />
                  )}
                  {step === 3 && (
                    <Section3
                      subPackage={subPackage} monthlyAmount={Number(monthlyAmount) || 0} duration={Number(duration) || 0}
                      onbPackage={onbPackage} onbFee={Number(onbFee) || 0}
                      subscriptionTotal={totals.subscriptionTotal} total={totals.total}
                      monthlyCommission={monthlyCommission} onboardingCommission={onboardingCommission}
                      companyName={companyName} setCompanyName={setCompanyName} address={address} setAddress={setAddress}
                      eircode={eircode} setEircode={setEircode} contactName={contactName} setContactName={setContactName}
                      contactEmail={contactEmail} setContactEmail={setContactEmail} contactPhone={contactPhone} setContactPhone={setContactPhone}
                      vat={vat} setVat={setVat}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/60 bg-white/70 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            <button onClick={() => (step > 1 ? setStep(step - 1) : onClose())} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              {step > 1 ? <><ChevronLeft size={16} /> Back</> : "Cancel"}
            </button>
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1B3A6B] text-white text-sm font-semibold rounded-xl hover:bg-[#152E55] transition-colors">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => submit(false)} disabled={submitting} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50">Save as Draft</button>
                <button onClick={() => submit(true)} disabled={submitting} className="flex items-center gap-2 px-5 py-3 bg-[#1B3A6B] text-white text-sm font-bold rounded-xl hover:bg-[#152E55] transition-colors disabled:opacity-60 shadow-lg">
                  {submitting ? <Spinner size="sm" className="text-white" /> : <FileText size={16} />} Generate SLA &amp; Create Onboarding
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ── Section 1 ────────────────────────────────────────────────────────────────
function Section1(p: {
  lead: Lead; subPackage: RecommendedPackage; onSelect: (pkg: RecommendedPackage) => void;
  monthlyAmount: string; setMonthlyAmount: (v: string) => void;
  subDiscount: boolean; setSubDiscount: (v: boolean) => void;
  subOriginal: string; setSubOriginal: (v: string) => void; subReason: string; setSubReason: (v: string) => void;
  duration: string; setDuration: (v: string) => void; startDate: string; setStartDate: (v: string) => void;
  paymentType: PaymentType; setPaymentType: (v: PaymentType) => void;
  phases: PhaseRow[]; setPhases: React.Dispatch<React.SetStateAction<PhaseRow[]>>;
}) {
  const recommended = (p.lead.recommended_package as RecommendedPackage) || "Professional";
  const updatePhase = (id: string, key: keyof PhaseRow, val: string) => p.setPhases((ps) => ps.map((x) => (x.localId === id ? { ...x, [key]: val } : x)));
  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold text-[#0F172A]">Subscription Package</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SUB_PACKAGES.map((pkg) => {
          const t = SUBSCRIPTION_TIERS[pkg]; const active = p.subPackage === pkg;
          return (
            <button key={pkg} onClick={() => p.onSelect(pkg)} className={cn("relative text-left p-4 rounded-2xl border-2 transition-all", active ? "border-[#1B3A6B] bg-[#1B3A6B]/5 shadow-md" : "border-slate-200 bg-white hover:border-slate-300")}>
              {pkg === recommended && <span className="absolute -top-2 left-3 text-[10px] font-bold bg-[#4C1D95] text-white px-2 py-0.5 rounded-full">⭐ Recommended</span>}
              {active && <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1B3A6B] text-white flex items-center justify-center"><Check size={12} /></span>}
              <p className="text-sm font-bold text-[#0F172A]">{pkg}</p>
              <p className="text-lg font-extrabold text-[#1B3A6B] mt-1">€{t.monthly.toLocaleString("en-IE")}<span className="text-xs font-normal text-slate-400">/mo</span></p>
              <p className="text-[11px] text-slate-500 mt-1.5">{t.freeInstalls === null ? "Unlimited installs" : `${t.freeInstalls} free installs`}{t.perAdditional ? `, €${t.perAdditional}/extra` : ", no extra cost"}</p>
            </button>
          );
        })}
      </div>

      <Field label="Agreed Monthly Amount (€)"><NumInput value={p.monthlyAmount} onChange={p.setMonthlyAmount} /></Field>

      <DiscountBlock applied={p.subDiscount} setApplied={p.setSubDiscount} original={p.subOriginal} setOriginal={p.setSubOriginal} discounted={p.monthlyAmount} setDiscounted={p.setMonthlyAmount} reason={p.subReason} setReason={p.setSubReason} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Contract Duration">
          <select value={p.duration} onChange={(e) => p.setDuration(e.target.value)} className={inputCls}>
            <option value="6">6 months</option><option value="12">12 months</option><option value="24">24 months</option>
          </select>
        </Field>
        <Field label="Contract Start Date"><input type="date" value={p.startDate} onChange={(e) => p.setStartDate(e.target.value)} className={inputCls} /></Field>
      </div>

      <Field label="Payment Type">
        <div className="flex gap-2">
          {(["monthly", "upfront"] as const).map((t) => (
            <button key={t} onClick={() => p.setPaymentType(t)} className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all", p.paymentType === t ? "bg-[#1B3A6B] text-white border-[#1B3A6B]" : "bg-white text-slate-600 border-slate-200")}>{t === "monthly" ? "Pay Monthly" : "Pay Upfront"}</button>
          ))}
        </div>
      </Field>

      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Pricing Phases</p>
        <div className="grid grid-cols-[1fr_90px_1fr_28px] gap-2 mb-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Monthly (€)</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Months</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Start</span><span />
        </div>
        <div className="space-y-2">
          {p.phases.map((ph, i) => (
            <div key={ph.localId} className="grid grid-cols-[1fr_90px_1fr_28px] gap-2 items-center">
              <NumInput value={ph.monthly} onChange={(v) => updatePhase(ph.localId, "monthly", v)} disabled={i === 0} />
              <NumInput value={ph.months} onChange={(v) => updatePhase(ph.localId, "months", v)} disabled={i === 0} />
              <input type="date" value={ph.start} onChange={(e) => updatePhase(ph.localId, "start", e.target.value)} disabled={i === 0} className={cn(inputCls, i === 0 && "opacity-60")} />
              {i > 0 ? <button onClick={() => p.setPhases((ps) => ps.filter((x) => x.localId !== ph.localId))} className="text-slate-400 hover:text-red-500"><X size={15} /></button> : <span />}
            </div>
          ))}
        </div>
        <button onClick={() => p.setPhases((ps) => [...ps, newPhase("", "")])} className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#1B3A6B] hover:underline"><Plus size={13} /> Add Phase</button>
        <p className="text-[10px] text-slate-400 mt-1">Phase 1 mirrors the agreed monthly amount and contract duration above.</p>
      </div>
    </div>
  );
}

// ── Section 2 ────────────────────────────────────────────────────────────────
function Section2(p: {
  onbPackage: OnboardingPackage; onSelect: (pkg: OnboardingPackage) => void;
  onbFee: string; setOnbFee: (v: string) => void; onbDiscount: boolean; setOnbDiscount: (v: boolean) => void;
  onbOriginal: string; setOnbOriginal: (v: string) => void; onbReason: string; setOnbReason: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold text-[#0F172A]">Onboarding Package</h3>
      <div className="grid grid-cols-1 gap-3">
        {ONB_PACKAGES.map((pkg) => {
          const m = PACKAGE_META[pkg]; const active = p.onbPackage === pkg;
          return (
            <button key={pkg} onClick={() => p.onSelect(pkg)} className={cn("relative text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3", active ? "border-[#1B3A6B] bg-[#1B3A6B]/5 shadow-md" : "border-slate-200 bg-white hover:border-slate-300")}>
              <div>
                <p className="text-sm font-bold text-[#0F172A]">{pkg} <span className="text-[#1B3A6B]">· {m.fee === 0 ? "Free" : "€" + m.fee.toLocaleString("en-IE")}</span></p>
                <p className="text-[11px] text-slate-500 mt-1">{m.summary}</p>
              </div>
              {active && <span className="shrink-0 w-5 h-5 rounded-full bg-[#1B3A6B] text-white flex items-center justify-center"><Check size={12} /></span>}
            </button>
          );
        })}
      </div>
      <Field label="Agreed Onboarding Fee (€)"><NumInput value={p.onbFee} onChange={p.setOnbFee} /></Field>
      <DiscountBlock applied={p.onbDiscount} setApplied={p.setOnbDiscount} original={p.onbOriginal} setOriginal={p.setOnbOriginal} discounted={p.onbFee} setDiscounted={p.setOnbFee} reason={p.onbReason} setReason={p.setOnbReason} />
    </div>
  );
}

// ── Section 3 ────────────────────────────────────────────────────────────────
function Section3(p: {
  subPackage: string; monthlyAmount: number; duration: number; onbPackage: string; onbFee: number;
  subscriptionTotal: number; total: number; monthlyCommission: number; onboardingCommission: number;
  companyName: string; setCompanyName: (v: string) => void; address: string; setAddress: (v: string) => void;
  eircode: string; setEircode: (v: string) => void; contactName: string; setContactName: (v: string) => void;
  contactEmail: string; setContactEmail: (v: string) => void; contactPhone: string; setContactPhone: (v: string) => void;
  vat: string; setVat: (v: string) => void;
}) {
  const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div className="flex justify-between items-center"><span className={cn("text-sm", bold ? "font-bold text-[#0F172A]" : "text-slate-600")}>{label}</span><span className={cn("text-sm", bold ? "font-bold text-[#1B3A6B]" : "font-semibold text-[#0F172A]")}>{value}</span></div>
  );
  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold text-[#0F172A]">Deal Summary</h3>
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-2.5">
        <Row label={`Subscription: ${p.subPackage}`} value={`${formatEuro(p.monthlyAmount)}/mo`} />
        <Row label="Contract Duration" value={`${p.duration} months`} />
        <Row label="Total Subscription Value" value={formatEuro(p.subscriptionTotal)} />
        <Row label={`Onboarding: ${p.onbPackage}`} value={formatEuro(p.onbFee)} />
        <div className="border-t border-emerald-200 pt-2.5"><Row label="Total Contract Value" value={formatEuro(p.total)} bold /></div>
        <div className="border-t border-emerald-200 pt-2.5 space-y-2">
          <Row label="Monthly Commission (AM · 5%)" value={formatEuro(p.monthlyCommission)} />
          <Row label="Onboarding Commission (AM · 40%)" value={formatEuro(p.onboardingCommission)} />
        </div>
      </div>

      <div>
        <h4 className="flex items-center gap-1.5 text-sm font-bold text-[#0F172A] mb-3"><Sparkles size={15} className="text-[#4C1D95]" /> Client details for SLA</h4>
        <div className="space-y-3">
          <Field label="Official Company Name *"><input value={p.companyName} onChange={(e) => p.setCompanyName(e.target.value)} className={inputCls} /></Field>
          <Field label="Company Address"><input value={p.address} onChange={(e) => p.setAddress(e.target.value)} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Eircode"><input value={p.eircode} onChange={(e) => p.setEircode(e.target.value)} className={inputCls} /></Field>
            <Field label="VAT Number (optional)"><input value={p.vat} onChange={(e) => p.setVat(e.target.value)} className={inputCls} /></Field>
          </div>
          <Field label="Contact Name"><input value={p.contactName} onChange={(e) => p.setContactName(e.target.value)} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Email"><input type="email" value={p.contactEmail} onChange={(e) => p.setContactEmail(e.target.value)} className={inputCls} /></Field>
            <Field label="Contact Phone"><input value={p.contactPhone} onChange={(e) => p.setContactPhone(e.target.value)} className={inputCls} /></Field>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── shared bits ──────────────────────────────────────────────────────────────
const inputCls = "w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>{children}</div>;
}
function NumInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">€</span>
      <input type="number" min="0" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "pl-7", disabled && "opacity-60 bg-slate-50")} />
    </div>
  );
}
function DiscountBlock(p: { applied: boolean; setApplied: (v: boolean) => void; original: string; setOriginal: (v: string) => void; discounted: string; setDiscounted: (v: string) => void; reason: string; setReason: (v: string) => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Discount Applied</span>
        <button onClick={() => p.setApplied(!p.applied)} role="switch" aria-checked={p.applied} className={cn("relative h-6 w-11 rounded-full transition-colors", p.applied ? "bg-[#1B3A6B]" : "bg-slate-300")}>
          <span className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", p.applied && "translate-x-5")} />
        </button>
      </div>
      <AnimatePresence>
        {p.applied && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-2 gap-3 pt-3">
              <Field label="Original Price (€)"><NumInput value={p.original} onChange={() => {}} disabled /></Field>
              <Field label="Discounted Price (€)"><NumInput value={p.discounted} onChange={p.setDiscounted} /></Field>
            </div>
            <div className="pt-3"><Field label="Discount Reason"><input value={p.reason} onChange={(e) => p.setReason(e.target.value)} className={inputCls} placeholder="e.g. multi-year commitment" /></Field></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
