/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SINGLE SOURCE OF TRUTH — Solar Flow package assemblies
 * ─────────────────────────────────────────────────────────────────────────────
 *  Everything pricing/feature related (lead scoring, deal close, SLA, pricing UI,
 *  recommendations) should read from this file. Do not redefine prices, install
 *  allowances, onboarding contents, or add-on rates anywhere else — derive them
 *  from here so they can never drift out of sync again.
 */

export type SubscriptionTier = "Starter" | "Professional" | "Enterprise";
export type OnboardingTier = "Basic" | "Pro" | "Premium";

export interface SubscriptionPackage {
  label: SubscriptionTier;
  /** Monthly subscription price, ex. VAT (€). */
  monthly: number;
  /** Installs bundled into the monthly price. null = unlimited. */
  installsIncluded: number | null;
  /** Price per install beyond the included allowance (€). 0 = n/a (unlimited tier). */
  perAdditionalInstall: number;
  /** Whether the AI Lead Intelligence module is included in the tier. */
  leadIntelligence: boolean;
  /** Reporting level included with the tier. */
  reporting: "Standard" | "Advanced" | "Advanced + custom";
  /** Employee Management module: a paid add-on, or bundled into the tier. */
  employeeManagement: "addon" | "included";
  /** Enterprise-only: bespoke portal builds available on a one-time, quoted fee. */
  customBuilds: boolean;
  /** Human-readable, ordered feature list for SLAs / pricing pages. */
  features: string[];
}

export interface OnboardingPackageDef {
  label: OnboardingTier;
  /** Once-off onboarding fee, ex. VAT (€). */
  fee: number;
  setupCall: string;
  training: string;
  onsite: string | null;
  dedicatedAM: boolean;
  /** Short one-line summary used in badges/cards. */
  summary: string;
}

const CORE_FEATURES = [
  "Lead & pipeline management",
  "Scheduling & job tracking",
  "Document storage",
  "Client portal & onboarding tools",
] as const;

export const SUBSCRIPTION_PACKAGES: Record<SubscriptionTier, SubscriptionPackage> = {
  Starter: {
    label: "Starter",
    monthly: 800,
    installsIncluded: 20,
    perAdditionalInstall: 45,
    leadIntelligence: false,
    reporting: "Standard",
    employeeManagement: "addon",
    customBuilds: false,
    features: [
      ...CORE_FEATURES,
      "20 installs included (€45 per additional)",
      "Standard reporting",
    ],
  },
  Professional: {
    label: "Professional",
    monthly: 1100,
    installsIncluded: 40,
    perAdditionalInstall: 32,
    leadIntelligence: true,
    reporting: "Advanced",
    employeeManagement: "addon",
    customBuilds: false,
    features: [
      ...CORE_FEATURES,
      "40 installs included (€32 per additional)",
      "Advanced reporting",
      "Lead Intelligence (AI scoring & research)",
    ],
  },
  Enterprise: {
    label: "Enterprise",
    monthly: 1600,
    installsIncluded: null,
    perAdditionalInstall: 0,
    leadIntelligence: true,
    reporting: "Advanced + custom",
    employeeManagement: "included",
    customBuilds: true,
    features: [
      ...CORE_FEATURES,
      "Unlimited installs",
      "Advanced + custom reporting",
      "Lead Intelligence (AI scoring & research)",
      "Employee Management included",
      "Bespoke portal builds — one-time fee, quoted case-by-case",
    ],
  },
};

export const ONBOARDING_PACKAGE_DEFS: Record<OnboardingTier, OnboardingPackageDef> = {
  Basic: {
    label: "Basic",
    fee: 0,
    setupCall: "45-min online setup call",
    training: "Client self-trains afterwards",
    onsite: null,
    dedicatedAM: true,
    summary: "45 min online setup call. Client self-trains afterwards. Dedicated AM.",
  },
  Pro: {
    label: "Pro",
    fee: 1500,
    setupCall: "45-min online setup call",
    training: "8 online training sessions (2 per department)",
    onsite: null,
    dedicatedAM: true,
    summary: "Setup call + 8 online training sessions (2 per department). Dedicated AM.",
  },
  Premium: {
    label: "Premium",
    fee: 2500,
    setupCall: "45-min online setup call",
    training: "8 online training sessions (2 per department)",
    onsite: "One full-day on-site training visit",
    dedicatedAM: true,
    summary: "Everything in Pro + a full-day on-site training visit. Dedicated AM.",
  },
};

/** À-la-carte add-ons available alongside any subscription tier. */
export const ADD_ONS = {
  employeeManagement: {
    label: "Employee Management",
    /** €/employee/month. Included free on Enterprise. */
    pricePerEmployeeMonth: 2.99,
  },
  qrCodes: {
    label: "QR Codes",
    /** €/code for the first 80 codes. */
    priceFirst80: 1.9,
    /** €/code for code 81 and beyond. */
    priceAfter80: 1.4,
    breakpoint: 80,
  },
  customBuild: {
    label: "Custom portal build",
    /** Enterprise only — bespoke additions billed as a one-time, case-by-case quote. */
    model: "one-time, quoted case-by-case (Enterprise only)",
  },
} as const;
