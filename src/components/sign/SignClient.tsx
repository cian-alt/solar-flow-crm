'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { CheckCircle2, FileText, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { monthsBetween } from "@/lib/contractRevenue";
import { SOLAR_FLOW_COMPANY } from "@/lib/companyDetails";
import { formatDate } from "@/lib/utils";
import SolarFlowLogo from "@/components/logo/SolarFlowLogo";
import Spinner from "@/components/ui/Spinner";

const euro = (n: number | null | undefined) => "€" + (n ?? 0).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Phase { monthly_price: number; start_date: string; end_date: string; }
interface Payload {
  contract: {
    id: string; subscription_package: string | null; monthly_amount: number | null;
    contract_duration_months: number | null; start_date: string | null; payment_type: string;
    onboarding_package: string | null; onboarding_fee: number | null; special_conditions: string | null;
    sla_html: string | null;
    sla_status: string | null; signed_at: string | null; signer_name: string | null; signer_title: string | null;
    signature_url: string | null;
    official_company_name: string | null; company_address: string | null; eircode: string | null; vat_number: string | null;
    created_at: string;
  };
  phases: Phase[];
  company: string;
  lead: { company_name: string; contact_name: string | null; email: string | null; phone: string | null };
  am: { full_name: string | null; email: string | null; avatar_initials: string | null } | null;
  onboarding: { id: string; sla_signed: boolean } | null;
}

export default function SignClient({ token }: { token: string }) {
  const supabase = createClient();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justSigned, setJustSigned] = useState(false);
  const sigRef = useRef<SignatureCanvas | null>(null);

  const load = useCallback(async () => {
    const { data: payload, error } = await supabase.rpc("sign_get_contract", { p_token: token });
    if (error || !payload) { setNotFound(true); setLoading(false); return; }
    setData(payload as Payload);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); supabase.rpc("sign_log_view", { p_token: token }); }, [load, token]);

  const submit = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) { alert("Please add your signature."); return; }
    if (!fullName.trim()) { alert("Please enter your full name."); return; }
    if (!jobTitle.trim()) { alert("Please enter your job title."); return; }
    if (!agree) { alert("Please confirm you agree to the terms."); return; }
    setSubmitting(true);
    const signatureUrl = sigRef.current.toDataURL("image/png");
    const { data: res, error } = await supabase.rpc("sign_submit_sla", {
      p_token: token, p_name: fullName.trim(), p_title: jobTitle.trim(), p_signature_url: signatureUrl, p_ip: "",
    });
    const r = res as { ok?: boolean; am_name?: string | null; am_email?: string | null } | null;
    if (error || !r?.ok) { setSubmitting(false); alert("Something went wrong. Please contact Solar Flow."); return; }
    // Refresh so the document re-renders in its signed, read-only state with the captured signature.
    await load();
    setJustSigned(true);
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  if (notFound || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-[#1B3A6B]">
      <div className="bg-white rounded-2xl p-10 max-w-md">
        <SolarFlowLogo size={36} />
        <h1 className="text-xl font-bold text-[#0F172A] mt-6">This link is invalid or has expired</h1>
        <p className="text-slate-500 mt-2">Please contact Solar Flow for a new signing link.</p>
      </div>
    </div>
  );

  const c = data.contract;
  // The signing gate is driven by THIS contract's own status — not the linked
  // onboarding's SLA flag — so a contract can be (re)signed independently.
  const signed = c.sla_status === "signed" || justSigned;

  const subscriptionTotal = data.phases.reduce((s, p) => s + (p.monthly_price ?? 0) * monthsBetween(p.start_date, p.end_date), 0);
  const total = subscriptionTotal + (c.onboarding_fee ?? 0);
  const ref = `SF-${c.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-[#1B3A6B] py-6 sm:py-10 px-3 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto">
        {/* Status banner */}
        {signed ? (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 print:hidden">
            <p className="flex items-center justify-center gap-2 text-emerald-800 font-semibold text-sm sm:text-base">
              <CheckCircle2 size={18} className="text-emerald-500" />
              {justSigned ? "Thank you — your agreement has been signed." : "This agreement has been signed."}
              {c.signer_name ? ` Signed by ${c.signer_name}.` : ""}
              {c.signed_at ? ` (${formatDate(c.signed_at)})` : ""}
            </p>
            <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
              {data.am?.full_name && (
                <span className="text-xs text-emerald-700">
                  Your Account Manager: <span className="font-semibold">{data.am.full_name}</span>
                  {data.am.email && <> · <a href={`mailto:${data.am.email}`} className="underline">{data.am.email}</a></>}
                </span>
              )}
              <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-50">
                <Printer size={13} /> Print / Save PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 text-white/90 text-xs sm:text-sm mb-4 print:hidden">
            <span className="font-semibold">Step 1: Read Agreement</span>
            <span className="text-white/40">→</span>
            <span className="text-white/60">Step 2: Sign Below</span>
          </div>
        )}

        {/* Document */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          <div className="bg-[#1B3A6B] text-white px-6 sm:px-10 py-6 flex items-center justify-between" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
            <SolarFlowLogo size={28} />
            <div className="text-right text-xs text-white/80">
              <p>Ref: {ref}</p>
              <p>{formatDate(c.created_at)}</p>
            </div>
          </div>

          <div className="px-6 sm:px-10 py-8 text-[15px] leading-relaxed text-slate-800">
            {c.sla_html ? (
              <div dangerouslySetInnerHTML={{ __html: c.sla_html }} />
            ) : (
            <>
            <h1 className="text-center text-2xl font-bold tracking-wide text-[#1B3A6B] mb-8">SERVICE AGREEMENT</h1>

            {/* Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Provider</p>
                <p className="font-semibold">{SOLAR_FLOW_COMPANY.legalName}</p>
                <p className="text-sm text-slate-600">{SOLAR_FLOW_COMPANY.address}</p>
                <p className="text-sm text-slate-600">VAT: {SOLAR_FLOW_COMPANY.vat}</p>
                <p className="text-sm text-slate-600">{SOLAR_FLOW_COMPANY.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Client</p>
                <p className="font-semibold">{data.company}</p>
                {c.company_address && <p className="text-sm text-slate-600">{c.company_address}</p>}
                {c.eircode && <p className="text-sm text-slate-600">{c.eircode}</p>}
                {c.vat_number && <p className="text-sm text-slate-600">VAT: {c.vat_number}</p>}
                {data.lead.contact_name && <p className="text-sm text-slate-600">Attn: {data.lead.contact_name}</p>}
              </div>
            </div>

            <Article n={1} title="Services">
              Solar Flow provides the Client with access to its cloud-based job-management software platform (the “Platform”),
              including lead and pipeline management, scheduling, job tracking, document storage, reporting and related services,
              on a software-as-a-service basis for the duration of this Agreement.
            </Article>
            <Article n={2} title="Term">
              This Agreement commences on {c.start_date ? formatDate(c.start_date) : "the Contract Start Date"} and continues for an
              initial term of {c.contract_duration_months ?? 12} months. Thereafter it renews automatically on a rolling monthly
              basis unless either party gives 30 days’ written notice of non-renewal.
            </Article>
            <Article n={3} title="Subscription Package">
              The Client subscribes to the <strong>{c.subscription_package ?? "—"}</strong> package at <strong>{euro(c.monthly_amount)}</strong> per month
              (exclusive of VAT). Pricing phases:
              <table className="w-full text-sm my-3 border-collapse">
                <thead><tr className="border-b border-slate-300 text-left text-slate-500">
                  <th className="py-1.5">Monthly</th><th>Start</th><th>End</th><th>Months</th><th className="text-right">Phase Total</th>
                </tr></thead>
                <tbody>
                  {data.phases.map((p, i) => { const m = monthsBetween(p.start_date, p.end_date); return (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-1.5">{euro(p.monthly_price)}</td><td>{formatDate(p.start_date)}</td><td>{formatDate(p.end_date)}</td><td>{m}</td><td className="text-right">{euro(p.monthly_price * m)}</td>
                    </tr>); })}
                </tbody>
              </table>
              Payment terms: {c.payment_type === "upfront" ? "the full contract value is due upfront on commencement." : "billed monthly in advance."}
            </Article>
            <Article n={4} title="Onboarding">
              The Client selects the <strong>{c.onboarding_package ?? "—"}</strong> onboarding package, a once-off fee of <strong>{euro(c.onboarding_fee)}</strong>,
              covering account setup, configuration and the training sessions associated with that package. Onboarding fees are non-refundable once onboarding has commenced.
            </Article>
            <Article n={5} title="Total Contract Value">
              Onboarding fee: {euro(c.onboarding_fee)}. Total subscription value over the initial term: {euro(subscriptionTotal)}.
              <strong> Grand total: {euro(total)}</strong> (exclusive of VAT).
            </Article>
            <Article n={6} title="Intellectual Property">
              All intellectual property rights in and to the Platform remain the exclusive property of Solar Flow. The Client is granted a
              non-exclusive, non-transferable licence to use the Platform for its internal business purposes for the term of this Agreement.
              All data entered by the Client remains the property of the Client.
            </Article>
            <Article n={7} title="Confidentiality">
              Each party shall keep confidential all non-public information disclosed by the other and shall not use or disclose it other than
              as necessary to perform this Agreement, save where required by law. This obligation survives termination.
            </Article>
            <Article n={8} title="Data Protection">
              Both parties shall comply with the General Data Protection Regulation (EU) 2016/679 and the Irish Data Protection Acts 1988–2018.
              Solar Flow processes personal data only on the Client’s documented instructions and applies appropriate technical and organisational measures.
            </Article>
            <Article n={9} title="Limitation of Liability">
              To the maximum extent permitted by law, neither party is liable for indirect or consequential loss. Solar Flow’s total aggregate
              liability under this Agreement is capped at the total fees paid by the Client in the three (3) months preceding the event giving rise to the claim.
            </Article>
            <Article n={10} title="Termination">
              Either party may terminate on 30 days’ written notice. Solar Flow may suspend or terminate access immediately where the Client’s account
              is more than 30 days in arrears. Fees accrued up to the termination date remain payable.
            </Article>
            <Article n={11} title="Governing Law">
              This Agreement is governed by the laws of Ireland and the parties submit to the exclusive jurisdiction of the Irish courts.
            </Article>
            <Article n={12} title="Special Conditions">
              {c.special_conditions?.trim() ? c.special_conditions : "None."}
            </Article>

            {/* Schedule A */}
            <h2 className="text-lg font-bold text-[#1B3A6B] mt-8 mb-3">Schedule A — Terms &amp; Conditions</h2>
            <div className="space-y-2 text-sm text-slate-700">
              <p><strong>A.1 Acceptable Use.</strong> The Client shall not misuse the Platform, attempt to gain unauthorised access, reverse engineer it, or use it to store unlawful content. Accounts are for the Client’s staff only.</p>
              <p><strong>A.2 Service Availability.</strong> Solar Flow targets 99% Platform availability measured monthly, excluding scheduled maintenance (notified at least 24 hours in advance) and events outside its reasonable control.</p>
              <p><strong>A.3 Support.</strong> Support is available Monday–Friday, 09:00–17:30 IST via the Client’s dedicated Account Manager. Target first response times: critical issues within 4 business hours, standard queries within 1 business day.</p>
              <p><strong>A.4 Data Backup.</strong> Client data is backed up daily and retained for 30 days. The Client may export its data at any time during the term.</p>
              <p><strong>A.5 Cancellation.</strong> The Client may cancel with 30 days’ written notice effective at the end of the then-current billing month. Pre-paid fees are non-refundable save where required by law.</p>
              <p><strong>A.6 Payment Disputes.</strong> Invoices are payable within 14 days. Disputed amounts must be raised in good faith within 14 days of invoice; undisputed amounts remain payable on time.</p>
              <p><strong>A.7 Fair Use.</strong> Subscription installs and usage allowances are set out in the selected package. Excess usage is billed at the per-unit rates published for that package.</p>
            </div>
            </>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-10 pt-6 border-t border-slate-200" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">For Solar Flow</p>
                <p className="text-sm text-slate-600">Name: ______________________</p>
                <p className="text-sm text-slate-600 mt-2">Title: ______________________</p>
                <p className="text-sm text-slate-600 mt-2">Date: ______________________</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">For {data.company}</p>

                {signed ? (
                  /* Read-only signed view */
                  <div>
                    <div className="border-2 border-slate-200 rounded-lg bg-white overflow-hidden h-[160px] flex items-center justify-center">
                      {c.signature_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.signature_url} alt="Client signature" className="max-h-[150px] max-w-full object-contain" />
                      ) : (
                        <span className="text-slate-400 text-sm italic">Signed electronically</span>
                      )}
                    </div>
                    <div className="mt-3 text-sm text-slate-600 space-y-1">
                      {c.signer_name && <p><span className="font-semibold text-[#0F172A]">{c.signer_name}</span>{c.signer_title ? `, ${c.signer_title}` : ""}</p>}
                      <p>Date: {c.signed_at ? formatDate(c.signed_at) : formatDate(new Date().toISOString())}</p>
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 size={14} /> Signed</span>
                    </div>
                  </div>
                ) : (
                  /* Signing form */
                  <>
                    <div className="border-2 border-slate-200 rounded-lg overflow-x-auto bg-white">
                      <SignatureCanvas ref={sigRef} penColor="#1B3A6B" canvasProps={{ width: 520, height: 160, className: "bg-white" }} />
                    </div>
                    <button onClick={() => sigRef.current?.clear()} className="text-xs text-slate-500 hover:text-[#1B3A6B] mt-1">Clear signature</button>
                    <div className="space-y-3 mt-3">
                      <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name *" className={signInput} />
                      <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job Title *" className={signInput} />
                      <p className="text-sm text-slate-500">Date: {formatDate(new Date().toISOString())}</p>
                      <label className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1B3A6B]" />
                        <span>I confirm I have read and agree to all terms of this Agreement.</span>
                      </label>
                      <button onClick={submit} disabled={submitting} className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[#1B3A6B] text-white text-base font-bold hover:bg-[#152E55] transition-colors disabled:opacity-60">
                        {submitting ? <Spinner size="sm" className="text-white" /> : <FileText size={18} />} Sign Agreement
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-white/50 mt-6 print:hidden">{SOLAR_FLOW_COMPANY.legalName} · {SOLAR_FLOW_COMPANY.website}</p>
      </div>
    </div>
  );
}

const signInput = "w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30 focus:border-[#1B3A6B]";

function Article({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="font-bold text-[#0F172A] mb-1">Article {n} — {title}</h3>
      <div className="text-slate-700">{children}</div>
    </div>
  );
}
