import type {
  ContactMethod,
  IntelligenceCategory,
  RecommendedPackage,
} from "@/types/database";

export interface CategoryMeta {
  label: string;
  emoji: string;
  pillClass: string; // background pill (cat-*)
  glowClass: string; // card glow (glow-*)
  hex: string; // primary colour for gauges / numbers
  description: string;
}

export const CATEGORY_META: Record<IntelligenceCategory, CategoryMeta> = {
  Hot: {
    label: "Hot",
    emoji: "🔴",
    pillClass: "cat-hot",
    glowClass: "glow-hot",
    hex: "#DC2626",
    description: "Demo ready — contact today",
  },
  Warm: {
    label: "Warm",
    emoji: "🟡",
    pillClass: "cat-warm",
    glowClass: "glow-warm",
    hex: "#D97706",
    description: "Strong interest — follow up this week",
  },
  Nurture: {
    label: "Nurture",
    emoji: "🔵",
    pillClass: "cat-nurture",
    glowClass: "glow-nurture",
    hex: "#2563EB",
    description: "Needs more research — monthly contact",
  },
  Cold: {
    label: "Cold",
    emoji: "⚫",
    pillClass: "cat-cold",
    glowClass: "glow-cold",
    hex: "#64748B",
    description: "Poor fit or insufficient data — deprioritise",
  },
};

export const CATEGORY_ORDER: IntelligenceCategory[] = ["Hot", "Warm", "Nurture", "Cold"];

export interface ContactMethodMeta {
  emoji: string;
  label: string;
}

export const CONTACT_METHOD_META: Record<ContactMethod, ContactMethodMeta> = {
  Phone: { emoji: "📞", label: "Phone" },
  LinkedIn: { emoji: "💼", label: "LinkedIn" },
  Email: { emoji: "📧", label: "Email" },
  WhatsApp: { emoji: "💬", label: "WhatsApp" },
  "In Person": { emoji: "📍", label: "In Person" },
};

export function contactMethodMeta(method: string | null | undefined): ContactMethodMeta {
  if (method && method in CONTACT_METHOD_META) {
    return CONTACT_METHOD_META[method as ContactMethod];
  }
  return { emoji: "📞", label: method || "Phone" };
}

export const PACKAGE_BADGE_CLASS: Record<RecommendedPackage, string> = {
  Starter: "pkg-starter",
  Professional: "pkg-professional",
  Enterprise: "pkg-enterprise",
};
