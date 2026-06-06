import { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";
import { SOLAR_FLOW_COMPANY, SLA_TERMS } from "./companyDetails";

export interface SlaPhase {
  monthly_price: number;
  start_date: string;
  end_date: string;
}

export interface SlaData {
  client: {
    companyName: string;
    address: string;
    eircode: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    vatNumber: string;
  };
  subscriptionPackage: string;
  monthlyAmount: number;
  contractDurationMonths: number;
  startDate: string; // yyyy-MM-dd
  paymentType: "monthly" | "upfront";
  phases: SlaPhase[];
  onboardingPackage: string;
  onboardingFee: number;
  totalContractValue: number;
}

const euro = (n: number) => "EUR " + (n ?? 0).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s: string) => { try { return format(parseISO(s), "dd/MM/yyyy"); } catch { return s; } };

/** Generate a professional SLA PDF and return it as a Blob. Browser-only (uses jsPDF). */
export function generateSlaPdf(data: SlaData): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const navy = [27, 58, 107] as const;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
  };
  const heading = (text: string) => {
    ensureSpace(34);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(text, margin, y); y += 8;
    doc.setDrawColor(220); doc.line(margin, y, margin + contentW, y); y += 16;
    doc.setTextColor(30);
  };
  const kv = (label: string, value: string) => {
    ensureSpace(16);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(90);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(20);
    doc.text(value || "—", margin + 150, y);
    y += 16;
  };
  const para = (text: string, size = 9) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(40);
    const lines = doc.splitTextToSize(text, contentW);
    ensureSpace(lines.length * (size + 3));
    doc.text(lines, margin, y);
    y += lines.length * (size + 3) + 4;
  };

  // ── Header ──
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text(SOLAR_FLOW_COMPANY.name, margin, 38);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("Service Level Agreement", margin, 56);
  doc.setFontSize(8);
  doc.text(`Generated ${format(new Date(), "dd/MM/yyyy")}`, pageW - margin, 38, { align: "right" });
  y = 96;

  // ── Parties ──
  heading("Parties");
  doc.setFontSize(9); doc.setTextColor(40);
  doc.setFont("helvetica", "bold"); doc.text("Provider", margin, y);
  doc.text("Client", margin + contentW / 2, y); y += 14;
  doc.setFont("helvetica", "normal");
  const provider = [SOLAR_FLOW_COMPANY.legalName, SOLAR_FLOW_COMPANY.address, `VAT: ${SOLAR_FLOW_COMPANY.vat}`, SOLAR_FLOW_COMPANY.email, SOLAR_FLOW_COMPANY.phone];
  const client = [data.client.companyName, data.client.address, data.client.eircode, data.client.vatNumber ? `VAT: ${data.client.vatNumber}` : "", data.client.contactName, data.client.contactEmail, data.client.contactPhone].filter(Boolean);
  const rows = Math.max(provider.length, client.length);
  for (let i = 0; i < rows; i++) {
    ensureSpace(13);
    if (provider[i]) doc.text(doc.splitTextToSize(provider[i], contentW / 2 - 10), margin, y);
    if (client[i]) doc.text(doc.splitTextToSize(client[i], contentW / 2 - 10), margin + contentW / 2, y);
    y += 13;
  }
  y += 8;

  // ── Subscription ──
  heading("Subscription Package");
  kv("Package", data.subscriptionPackage);
  kv("Monthly Amount", euro(data.monthlyAmount));
  kv("Contract Duration", `${data.contractDurationMonths} months`);
  kv("Contract Start Date", fmtDate(data.startDate));
  kv("Payment Type", data.paymentType === "upfront" ? "Upfront" : "Monthly");
  y += 4;

  // ── Payment schedule table ──
  heading("Payment Schedule");
  const col = [margin, margin + 200, margin + 320, margin + 440];
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(90);
  ensureSpace(16);
  doc.text("Monthly Amount", col[0], y); doc.text("Start", col[1], y); doc.text("End", col[2], y); doc.text("Phase", col[3], y);
  y += 4; doc.setDrawColor(225); doc.line(margin, y, margin + contentW, y); y += 12;
  doc.setFont("helvetica", "normal"); doc.setTextColor(30);
  data.phases.forEach((p, i) => {
    ensureSpace(14);
    doc.text(euro(p.monthly_price), col[0], y);
    doc.text(fmtDate(p.start_date), col[1], y);
    doc.text(fmtDate(p.end_date), col[2], y);
    doc.text(`${i + 1}`, col[3], y);
    y += 14;
  });
  y += 6;

  // ── Onboarding ──
  heading("Onboarding Package");
  kv("Package", data.onboardingPackage);
  kv("Onboarding Fee", euro(data.onboardingFee));
  y += 2;

  // ── Total ──
  ensureSpace(28);
  doc.setFillColor(236, 253, 245); doc.rect(margin, y - 4, contentW, 24, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(5, 122, 85);
  doc.text("Total Contract Value", margin + 8, y + 12);
  doc.text(euro(data.totalContractValue), margin + contentW - 8, y + 12, { align: "right" });
  y += 34; doc.setTextColor(30);

  // ── Terms ──
  heading("Terms & Conditions");
  SLA_TERMS.forEach((t, i) => para(`${i + 1}. ${t}`, 8.5));
  y += 8;

  // ── Signatures ──
  ensureSpace(90);
  heading("Signatures");
  const sigY = y + 30;
  const half = contentW / 2;
  doc.setDrawColor(120);
  doc.line(margin, sigY, margin + half - 20, sigY);
  doc.line(margin + half + 20, sigY, margin + contentW, sigY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
  doc.text(`For and on behalf of ${SOLAR_FLOW_COMPANY.legalName}`, margin, sigY + 14);
  doc.text(`For and on behalf of ${data.client.companyName}`, margin + half + 20, sigY + 14);
  doc.text("Name / Date", margin, sigY + 28);
  doc.text("Name / Date", margin + half + 20, sigY + 28);

  return doc.output("blob");
}
