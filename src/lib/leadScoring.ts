import type {
  Lead,
  ContractorType,
  ContactMethod,
  IntelligenceCategory,
  RecommendedPackage,
  RecommendedOnboarding,
} from "@/types/database";

// ─────────────────────────────────────────────────────────────────────────────
// Solar Flow package catalogue (used for scoring + MRR estimation)
// ─────────────────────────────────────────────────────────────────────────────

export const SUBSCRIPTION_TIERS: Record<
  RecommendedPackage,
  { monthly: number; freeInstalls: number | null; perAdditional: number; label: string }
> = {
  Starter: { monthly: 800, freeInstalls: 20, perAdditional: 45, label: "Starter" },
  Professional: { monthly: 1100, freeInstalls: 40, perAdditional: 32, label: "Professional" },
  Enterprise: { monthly: 1600, freeInstalls: null, perAdditional: 0, label: "Enterprise" },
};

export const ONBOARDING_PACKAGES: Record<
  RecommendedOnboarding,
  { fee: number; label: string; detail: string }
> = {
  Basic: { fee: 0, label: "Basic", detail: "1hr setup, dedicated AM" },
  Pro: { fee: 1500, label: "Pro", detail: "1hr setup, dedicated AM, 3 online training sessions per dept" },
  Premium: { fee: 2500, label: "Premium", detail: "1hr setup, dedicated AM, in-person training per dept" },
};

// Employee Management add-on: €2.99/employee/month
const EMS_PER_EMPLOYEE = 2.99;
// QR codes: €1.90/code (1-80), €1.40/code (81+)
const QR_PRICE_LOW = 1.9;
const QR_PRICE_HIGH = 1.4;

export const CONTRACTOR_TYPES: ContractorType[] = [
  "Electrical",
  "Plumbing",
  "General",
  "Solar",
  "HVAC",
  "Mechanical",
  "Fit-out",
  "Civil",
  "Multi-trade",
];

export const ANNUAL_TURNOVERS = [
  "Under €500k",
  "€500k-€1M",
  "€1M-€5M",
  "€5M-€10M",
  "Over €10M",
] as const;

export const LINKEDIN_ACTIVITIES = [
  "Very Active",
  "Active",
  "Occasional",
  "Inactive",
  "No Profile",
] as const;

export const CONTACT_METHODS: ContactMethod[] = [
  "Phone",
  "LinkedIn",
  "Email",
  "WhatsApp",
  "In Person",
];

// All 26 counties of the Republic of Ireland
export const IRISH_COUNTIES = [
  "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway", "Kerry",
  "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", "Louth",
  "Mayo", "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary",
  "Waterford", "Westmeath", "Wexford", "Wicklow",
] as const;

// The 10 research fields tracked for completeness (encourages AMs to finish research)
export const RESEARCH_FIELDS: (keyof Lead)[] = [
  "contractor_type",
  "jobs_per_week",
  "annual_turnover",
  "num_employees",
  "county",
  "uses_existing_software",
  "linkedin_url",
  "linkedin_activity",
  "preferred_contact_method",
  "decision_maker_identified",
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LeadEngagement {
  hasCall: boolean;
  hasNotes: boolean;
  hasFollowUp: boolean;
  hasAnsweredCall: boolean;
}

export interface ScoreComponent {
  label: string;
  points: number;
  max: number;
}

export interface IntelligenceResult {
  score: number;
  category: IntelligenceCategory;
  breakdown: ScoreComponent[];
  recommendedPackage: RecommendedPackage | null;
  recommendedPackagePrice: number;
  recommendedOnboarding: RecommendedOnboarding;
  recommendedOnboardingFee: number;
  estimatedMrr: number;
  estimatedFirstYearValue: number;
  primaryChannel: ContactMethod;
  secondaryChannel: ContactMethod;
  recommendedContactMethod: string;
  aiNotes: string;
  talkingPoints: string[];
  suggestedOpener: string;
  bestTimeToCall: string;
  researchFilled: number;
  researchTotal: number;
}

const EMPTY_ENGAGEMENT: LeadEngagement = {
  hasCall: false,
  hasNotes: false,
  hasFollowUp: false,
  hasAnsweredCall: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-scores (total 100)
// ─────────────────────────────────────────────────────────────────────────────

function scoreVolume(jobsPerWeek: number | null): number {
  const j = jobsPerWeek ?? 0;
  if (j >= 20) return 30;
  if (j >= 10) return 20;
  if (j >= 5) return 12;
  if (j >= 1) return 5;
  return 0;
}

function scoreCompanySize(numEmployees: number | null): number {
  const n = numEmployees ?? 0;
  if (n >= 50) return 15;
  if (n >= 20) return 12;
  if (n >= 11) return 8;
  if (n >= 5) return 4;
  if (n >= 1) return 1;
  return 0;
}

function scoreTurnover(turnover: Lead["annual_turnover"]): number {
  switch (turnover) {
    case "Over €10M": return 15;
    case "€5M-€10M": return 12;
    case "€1M-€5M": return 8;
    case "€500k-€1M": return 4;
    case "Under €500k": return 1;
    default: return 0;
  }
}

function scoreTechReadiness(usesSoftware: boolean | null, numEmployees: number | null): number {
  if (usesSoftware) return 8;
  if ((numEmployees ?? 0) >= 10) return 5;
  return 2;
}

function scoreContractorFit(type: ContractorType | null): number {
  switch (type) {
    case "Electrical":
    case "Solar":
      return 10;
    case "Multi-trade":
      return 8;
    case "HVAC":
    case "Mechanical":
      return 7;
    case "General":
      return 5;
    case "Plumbing":
    case "Fit-out":
    case "Civil":
      return 3;
    default:
      return 0;
  }
}

function scoreResearchQuality(lead: Lead): number {
  let pts = 0;
  if (lead.decision_maker_identified) pts += 4;
  if (lead.linkedin_url) pts += 2;
  if (lead.linkedin_activity === "Active" || lead.linkedin_activity === "Very Active") pts += 2;
  if (lead.preferred_contact_method) pts += 2;
  return pts;
}

function scoreCrmEngagement(engagement: LeadEngagement): number {
  let pts = 0;
  if (engagement.hasCall) pts += 3;
  if (engagement.hasNotes) pts += 2;
  if (engagement.hasFollowUp) pts += 2;
  if (engagement.hasAnsweredCall) pts += 3;
  return pts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Category / package / onboarding logic
// ─────────────────────────────────────────────────────────────────────────────

export function categoryForScore(score: number): IntelligenceCategory {
  if (score >= 75) return "Hot";
  if (score >= 50) return "Warm";
  if (score >= 25) return "Nurture";
  return "Cold";
}

function recommendPackage(lead: Lead): RecommendedPackage | null {
  const jobs = lead.jobs_per_week ?? 0;
  const emps = lead.num_employees ?? 0;
  if (jobs >= 20 || emps >= 50) return "Enterprise";
  if (jobs >= 10 || emps >= 20) return "Professional";
  if (jobs >= 5 || emps >= 5) return "Starter";
  if (jobs >= 1) return "Starter";
  return null;
}

function recommendOnboarding(pkg: RecommendedPackage | null, usesSoftware: boolean | null): RecommendedOnboarding {
  if (pkg === "Enterprise") return "Premium";
  if (pkg === "Professional") return "Pro";
  // Starter: experienced software users can self-serve on Basic, otherwise Pro for hand-holding
  if (pkg === "Starter") return usesSoftware ? "Basic" : "Pro";
  return "Basic";
}

// ─────────────────────────────────────────────────────────────────────────────
// MRR estimation
// ─────────────────────────────────────────────────────────────────────────────

function estimateQrMonthly(jobsPerWeek: number | null): number {
  const jobs = jobsPerWeek ?? 0;
  if (jobs <= 0) return 0;
  // Assume ~1 QR code per install. Monthly installs ≈ jobs/week × 4.33 weeks.
  const monthlyCodes = Math.round(jobs * 4.33);
  const price = monthlyCodes >= 81 ? QR_PRICE_HIGH : QR_PRICE_LOW;
  return Math.round(monthlyCodes * price);
}

function estimateMrr(lead: Lead, pkg: RecommendedPackage | null): number {
  if (!pkg) return 0;
  const base = SUBSCRIPTION_TIERS[pkg].monthly;
  const qr = estimateQrMonthly(lead.jobs_per_week);
  const emps = lead.num_employees ?? 0;
  // Employee Management add-on is most relevant for larger orgs on Enterprise.
  const emsLikely = pkg === "Enterprise" && emps >= 10;
  const ems = emsLikely ? Math.round(emps * EMS_PER_EMPLOYEE) : 0;
  return base + qr + ems;
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact method recommendation (primary + secondary)
// ─────────────────────────────────────────────────────────────────────────────

function recommendContactChannels(lead: Lead): { primary: ContactMethod; secondary: ContactMethod } {
  // Honour an explicitly researched preference first.
  if (lead.preferred_contact_method) {
    const pref = lead.preferred_contact_method;
    const fallback: ContactMethod = pref === "Phone" ? "Email" : "Phone";
    return { primary: pref, secondary: fallback };
  }

  const activeLinkedIn =
    lead.linkedin_activity === "Very Active" || lead.linkedin_activity === "Active";

  if (activeLinkedIn && lead.decision_maker_linkedin) {
    return { primary: "LinkedIn", secondary: "Email" };
  }
  if (lead.uses_existing_software) {
    return { primary: "Email", secondary: "Phone" };
  }
  if ((lead.jobs_per_week ?? 0) >= 10) {
    return { primary: "Phone", secondary: "Email" };
  }
  if (!lead.linkedin_url && (lead.num_employees ?? 0) < 10) {
    return { primary: "WhatsApp", secondary: "Phone" };
  }
  return { primary: "Phone", secondary: "LinkedIn" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Narrative generation
// ─────────────────────────────────────────────────────────────────────────────

function jobsPhrase(jobs: number | null): string {
  if (jobs === null || jobs <= 0) return "an unconfirmed number of";
  return `approximately ${jobs}`;
}

function employeesPhrase(emps: number | null): string {
  if (emps === null || emps <= 0) return "an unknown number of";
  return String(emps);
}

function talkingPointFor(lead: Lead): string {
  if (lead.contractor_type === "Electrical") {
    return `as an electrical contractor they handle high solar install volumes where job tracking pays off fastest`;
  }
  if (lead.uses_existing_software) {
    return `they already use ${lead.existing_software_name || "job software"}, so lead with a clean migration and the install-volume savings`;
  }
  if ((lead.jobs_per_week ?? 0) >= 20) {
    return `their install volume justifies unlimited installs on Enterprise — anchor on cost-per-install savings`;
  }
  if ((lead.num_employees ?? 0) >= 20) {
    return `with a sizeable team, coordination and employee management are the strongest hooks`;
  }
  return `position Solar Flow as the simplest way to keep their growing pipeline organised`;
}

function buildAiNotes(lead: Lead, pkg: RecommendedPackage | null, primary: ContactMethod): string {
  const company = lead.company_name || "This contractor";
  const type = (lead.contractor_type || "general").toLowerCase();
  const county = lead.county || "Ireland";
  const jobs = jobsPhrase(lead.jobs_per_week);
  const emps = employeesPhrase(lead.num_employees);

  let fitSentence: string;
  if (pkg) {
    const price = SUBSCRIPTION_TIERS[pkg].monthly;
    fitSentence = `Based on their profile they are a strong fit for the ${pkg} plan at €${price.toLocaleString("en-IE")}/month.`;
  } else {
    fitSentence = `There isn't yet enough volume data to recommend a plan — complete the research fields to sharpen the recommendation.`;
  }

  return (
    `${company} is a ${type} contractor based in ${county} completing ${jobs} jobs/week with ${emps} employees. ` +
    `${fitSentence} ` +
    `Recommended first contact via ${primary} — ${talkingPointFor(lead)}.`
  );
}

function buildTalkingPoints(lead: Lead, pkg: RecommendedPackage | null): string[] {
  const points: string[] = [];
  if ((lead.jobs_per_week ?? 0) > 0) {
    points.push(`Handles ${lead.jobs_per_week} jobs/week — quantify the admin time saved per install.`);
  }
  if (lead.contractor_type) {
    points.push(`${lead.contractor_type} contractor — tailor examples to their trade's workflow.`);
  }
  if (lead.uses_existing_software) {
    points.push(
      `Currently on ${lead.existing_software_name || "another tool"} — ask what's missing and frame Solar Flow as the upgrade.`,
    );
  } else {
    points.push(`No job-management software yet — lead with how quickly they can be set up (1hr onboarding).`);
  }
  if (pkg) {
    points.push(`Recommend the ${pkg} tier and walk through the install allowance vs. their volume.`);
  }
  if (lead.decision_maker_identified && lead.decision_maker_name) {
    points.push(`Decision maker is ${lead.decision_maker_name} — get to them directly.`);
  } else {
    points.push(`Decision maker not yet confirmed — qualify who signs off on tooling early.`);
  }
  if (lead.county) {
    points.push(`Based in ${lead.county} — reference local solar contractors already using Solar Flow.`);
  }
  return points;
}

function bestTimeToCall(lead: Lead): string {
  const jobs = lead.jobs_per_week ?? 0;
  if (jobs >= 10) return "Early morning (7:30–8:30am) or after 5pm — they're on-site during the day.";
  if (lead.preferred_contact_method === "Phone") return "Mid-morning (10–11am), once the day's jobs are dispatched.";
  return "Early afternoon (1–3pm) tends to get the best pick-up rate for smaller teams.";
}

// ─────────────────────────────────────────────────────────────────────────────
// Research completeness
// ─────────────────────────────────────────────────────────────────────────────

export function researchCompleteness(lead: Lead): { filled: number; total: number } {
  let filled = 0;
  for (const field of RESEARCH_FIELDS) {
    const v = lead[field];
    if (field === "uses_existing_software" || field === "decision_maker_identified") {
      // Booleans count as "researched" once the AM has actively set them true.
      if (v === true) filled += 1;
    } else if (v !== null && v !== undefined && v !== "") {
      filled += 1;
    }
  }
  return { filled, total: RESEARCH_FIELDS.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export function scoreLeadIntelligence(
  lead: Lead,
  engagement: LeadEngagement = EMPTY_ENGAGEMENT,
): IntelligenceResult {
  const breakdown: ScoreComponent[] = [
    { label: "Volume & Size", points: scoreVolume(lead.jobs_per_week), max: 30 },
    { label: "Company Size", points: scoreCompanySize(lead.num_employees), max: 15 },
    { label: "Annual Turnover", points: scoreTurnover(lead.annual_turnover), max: 15 },
    { label: "Technology Readiness", points: scoreTechReadiness(lead.uses_existing_software, lead.num_employees), max: 10 },
    { label: "Contractor Type Fit", points: scoreContractorFit(lead.contractor_type), max: 10 },
    { label: "Research Quality", points: scoreResearchQuality(lead), max: 10 },
    { label: "CRM Engagement", points: scoreCrmEngagement(engagement), max: 10 },
  ];

  const score = Math.min(100, breakdown.reduce((sum, c) => sum + c.points, 0));
  const category = categoryForScore(score);

  const pkg = recommendPackage(lead);
  const onboarding = recommendOnboarding(pkg, lead.uses_existing_software);
  const estimatedMrr = estimateMrr(lead, pkg);
  const onboardingFee = ONBOARDING_PACKAGES[onboarding].fee;

  const { primary, secondary } = recommendContactChannels(lead);
  const aiNotes = buildAiNotes(lead, pkg, primary);
  const talkingPoints = buildTalkingPoints(lead, pkg);
  const { filled, total } = researchCompleteness(lead);

  return {
    score,
    category,
    breakdown,
    recommendedPackage: pkg,
    recommendedPackagePrice: pkg ? SUBSCRIPTION_TIERS[pkg].monthly : 0,
    recommendedOnboarding: onboarding,
    recommendedOnboardingFee: onboardingFee,
    estimatedMrr,
    estimatedFirstYearValue: estimatedMrr * 12 + onboardingFee,
    primaryChannel: primary,
    secondaryChannel: secondary,
    recommendedContactMethod: primary,
    aiNotes,
    talkingPoints,
    suggestedOpener: buildOpener(lead),
    bestTimeToCall: bestTimeToCall(lead),
    researchFilled: filled,
    researchTotal: total,
  };
}

function buildOpener(lead: Lead): string {
  const name = lead.decision_maker_name || lead.contact_name || "there";
  const firstName = name.split(/\s+/)[0];
  const company = lead.company_name || "your company";
  const typeText = lead.contractor_type ? `${lead.contractor_type.toLowerCase()} installs` : "installs";
  const countyText = lead.county ? ` across ${lead.county}` : "";
  return (
    `Hi ${firstName}, I noticed ${company} completes a high volume of ${typeText}${countyText} — ` +
    `we work with contractors just like you to streamline job management and cut the admin on every install.`
  );
}

/**
 * The subset of Lead columns that scoreLeadIntelligence persists back to the DB.
 * Keeps the dashboard "Re-score All" and the detail-page "Save & Re-score" in sync.
 */
export function intelligenceUpdate(result: IntelligenceResult): Partial<Lead> {
  return {
    intelligence_score: result.score,
    intelligence_category: result.category,
    recommended_package: result.recommendedPackage,
    recommended_onboarding: result.recommendedOnboarding,
    estimated_mrr: result.estimatedMrr,
    recommended_contact_method: result.recommendedContactMethod,
    ai_notes: result.aiNotes,
  };
}
