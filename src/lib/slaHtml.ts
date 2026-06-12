import { format, parseISO } from "date-fns";
import { SOLAR_FLOW_COMPANY } from "./companyDetails";
import { monthsBetween } from "./contractRevenue";
import { PACKAGE_META } from "./onboarding";
import type { OnboardingPackage } from "@/types/database";

export interface SlaHtmlInput {
  contractId: string;
  reference: string; // SF-2026-0001
  company: string;
  clientAddress: string;
  clientEircode: string;
  clientVat: string;
  contactName: string;
  subscriptionPackage: string | null;
  monthlyAmount: number;
  durationMonths: number;
  startDate: string | null;
  paymentType: string;
  phases: { monthly_price: number; start_date: string; end_date: string }[];
  onboardingPackage: string | null;
  onboardingFee: number;
  specialConditions: string | null;
}

// Escape any dynamic value before it goes into the stored HTML.
function esc(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const euro = (n: number | null | undefined) => "€" + (n ?? 0).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fdate = (s: string | null) => { if (!s) return "—"; try { return format(parseISO(s), "dd/MM/yyyy"); } catch { return esc(s); } };

/** Build the full, self-contained SLA document HTML (already escaped — safe to render). */
export function buildSlaHtml(input: SlaHtmlInput): string {
  const subTotal = input.phases.reduce((s, p) => s + (p.monthly_price ?? 0) * monthsBetween(p.start_date, p.end_date), 0);
  const total = subTotal + (input.onboardingFee || 0);
  const onbSummary = input.onboardingPackage ? PACKAGE_META[input.onboardingPackage as OnboardingPackage]?.summary ?? "" : "";

  const phaseRows = input.phases.map((p, i) => {
    const m = monthsBetween(p.start_date, p.end_date);
    return `<tr><td>${i + 1}</td><td>${euro(p.monthly_price)}</td><td>${fdate(p.start_date)}</td><td>${fdate(p.end_date)}</td><td>${m}</td><td style="text-align:right">${euro(p.monthly_price * m)}</td></tr>`;
  }).join("");

  const article = (n: number, title: string, body: string) =>
    `<section class="article"><h3>Article ${n} — ${esc(title)}</h3><div>${body}</div></section>`;

  return `<!-- sla:${esc(input.contractId)} -->
<div class="sla-doc">
  <style>
    .sla-doc{font-family:Georgia,'Times New Roman',serif;color:#1e293b;line-height:1.6;font-size:15px}
    .sla-doc h1{text-align:center;color:#1B3A6B;font-size:26px;letter-spacing:1px;margin:8px 0 24px}
    .sla-doc h2{color:#1B3A6B;font-size:18px;margin:28px 0 10px}
    .sla-doc h3{color:#0F172A;font-size:15px;margin:0 0 4px}
    .sla-doc .article{margin-bottom:18px}
    .sla-doc table{width:100%;border-collapse:collapse;margin:10px 0;font-size:14px}
    .sla-doc th,.sla-doc td{border-bottom:1px solid #e2e8f0;padding:6px 4px;text-align:left}
    .sla-doc .meta{display:flex;justify-content:space-between;font-size:13px;color:#64748b;margin-bottom:18px}
    .sla-doc .parties{display:flex;gap:32px;margin:18px 0}
    .sla-doc .parties>div{flex:1}
    .sla-doc .label{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;font-weight:bold}
    .sla-doc .total{background:#ecfdf5;padding:12px 16px;border-radius:8px;font-weight:bold;color:#057a55;display:flex;justify-content:space-between;margin-top:10px}
  </style>

  <h1>SERVICE AGREEMENT</h1>
  <div class="meta">
    <span><strong>Reference:</strong> ${esc(input.reference)}</span>
    <span><strong>Date:</strong> ${fdate(input.startDate)}</span>
  </div>

  <div class="parties">
    <div>
      <p class="label">Provider</p>
      <p><strong>${esc(SOLAR_FLOW_COMPANY.legalName)}</strong><br/>${esc(SOLAR_FLOW_COMPANY.address)}<br/>${SOLAR_FLOW_COMPANY.vat ? `VAT: ${esc(SOLAR_FLOW_COMPANY.vat)}<br/>` : ""}${esc(SOLAR_FLOW_COMPANY.email)}</p>
    </div>
    <div>
      <p class="label">Client</p>
      <p><strong>${esc(input.company)}</strong><br/>${esc(input.clientAddress)}<br/>${esc(input.clientEircode)}${input.clientVat ? `<br/>VAT: ${esc(input.clientVat)}` : ""}${input.contactName ? `<br/>Attn: ${esc(input.contactName)}` : ""}</p>
    </div>
  </div>

  ${article(1, "Services", `Solar Flow provides the Client with access to its cloud-based job-management software platform (the “Platform”), including lead and pipeline management, scheduling, job tracking, document storage and reporting, on a software-as-a-service basis for the duration of this Agreement.`)}
  ${article(2, "Term", `This Agreement commences on ${fdate(input.startDate)} for an initial term of ${esc(input.durationMonths)} months, renewing automatically on a rolling monthly basis unless either party gives 30 days’ written notice.`)}
  ${article(3, "Subscription Package", `The Client subscribes to the <strong>${esc(input.subscriptionPackage ?? "—")}</strong> package at <strong>${euro(input.monthlyAmount)}</strong> per month (ex. VAT).
    <table><thead><tr><th>Phase</th><th>Monthly</th><th>Start</th><th>End</th><th>Months</th><th style="text-align:right">Total</th></tr></thead><tbody>${phaseRows}</tbody></table>
    Payment terms: ${input.paymentType === "upfront" ? "full contract value due upfront on commencement." : "billed monthly in advance."}`)}
  ${article(4, "Onboarding", `The Client selects the <strong>${esc(input.onboardingPackage ?? "—")}</strong> onboarding package — a once-off fee of <strong>${euro(input.onboardingFee)}</strong>. ${esc(onbSummary)} Onboarding fees are non-refundable once onboarding has commenced.`)}
  ${article(5, "Total Contract Value", `Onboarding fee: ${euro(input.onboardingFee)}. Total subscription value over the initial term: ${euro(subTotal)}.<div class="total"><span>Grand Total (ex. VAT)</span><span>${euro(total)}</span></div>`)}
  ${article(6, "Intellectual Property", `All intellectual property rights in the Platform remain the exclusive property of Solar Flow. The Client receives a non-exclusive, non-transferable licence to use the Platform for its internal business purposes for the term. All Client data remains the Client’s property.`)}
  ${article(7, "Confidentiality", `Each party shall keep confidential all non-public information disclosed by the other and use it only to perform this Agreement, save where required by law. This obligation survives termination.`)}
  ${article(8, "Data Protection", `Both parties comply with the GDPR (EU) 2016/679 and the Irish Data Protection Acts 1988–2018. Solar Flow processes personal data only on the Client’s documented instructions with appropriate technical and organisational measures.`)}
  ${article(9, "Limitation of Liability", `To the maximum extent permitted by law, neither party is liable for indirect or consequential loss. Solar Flow’s total aggregate liability is capped at the total fees paid in the three (3) months preceding the event giving rise to the claim.`)}
  ${article(10, "Termination", `Either party may terminate on 30 days’ written notice. Solar Flow may suspend or terminate access immediately where the account is more than 30 days in arrears. Fees accrued to the termination date remain payable.`)}
  ${article(11, "Governing Law", `This Agreement is governed by the laws of the Republic of Ireland and the parties submit to the exclusive jurisdiction of the Irish courts.`)}
  ${article(12, "Special Conditions", esc(input.specialConditions?.trim() || "None."))}

  <h2>Schedule A — Terms &amp; Conditions</h2>
  <p><strong>A.1 Acceptable Use.</strong> The Client shall not misuse the Platform, attempt unauthorised access, reverse engineer it, or store unlawful content. Accounts are for the Client’s staff only.</p>
  <p><strong>A.2 Service Availability.</strong> Solar Flow targets 99% Platform availability measured monthly, excluding scheduled maintenance (24h notice) and events outside its reasonable control.</p>
  <p><strong>A.3 Support.</strong> Available Mon–Fri 09:00–17:30 IST via the dedicated Account Manager. Target first response: critical within 4 business hours, standard within 1 business day.</p>
  <p><strong>A.4 Data Backup.</strong> Client data is backed up daily and retained for 30 days; the Client may export its data at any time during the term.</p>
  <p><strong>A.5 Cancellation.</strong> The Client may cancel on 30 days’ written notice effective at the end of the then-current billing month. Pre-paid fees are non-refundable save where required by law.</p>
  <p><strong>A.6 Payment Disputes.</strong> Invoices are payable within 14 days. Disputed amounts must be raised in good faith within 14 days; undisputed amounts remain payable on time.</p>

  <h2>Signatures</h2>
  <div class="parties">
    <div>
      <p class="label">For ${esc(SOLAR_FLOW_COMPANY.legalName)}</p>
      <p>Name: ____________________<br/><br/>Title: ____________________<br/><br/>Date: ____________________</p>
    </div>
    <div>
      <p class="label">For ${esc(input.company)}</p>
      <p>Signature captured electronically below.</p>
    </div>
  </div>
</div>`;
}
