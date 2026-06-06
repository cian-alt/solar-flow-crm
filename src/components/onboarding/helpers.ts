import type { LucideIcon } from "lucide-react";
import {
  FileSignature,
  CreditCard,
  Globe,
  Mail,
  CalendarClock,
  GraduationCap,
  Handshake,
  Rocket,
  Settings,
  UserCheck,
  CircleDot,
} from "lucide-react";
import type {
  OnboardingStatus,
  OnboardingStepStatus,
  OnboardingStepType,
  TrainingSessionStatus,
} from "@/types/database";

export const STEP_TYPE_ICON: Record<OnboardingStepType, LucideIcon> = {
  sla_signing: FileSignature,
  payment: CreditCard,
  portal_activation: Globe,
  department_emails: Mail,
  training_schedule: CalendarClock,
  training_session: GraduationCap,
  handover: Handshake,
  go_live: Rocket,
  account_setup: Settings,
  am_intro: UserCheck,
  custom: CircleDot,
};

export const ONBOARDING_STATUS_META: Record<OnboardingStatus, { label: string; pillClass: string }> = {
  not_started: { label: "Not Started", pillClass: "onb-not_started" },
  in_progress: { label: "In Progress", pillClass: "onb-in_progress" },
  completed: { label: "Completed", pillClass: "onb-completed" },
  on_hold: { label: "On Hold", pillClass: "onb-on_hold" },
};

export const STEP_STATUS_META: Record<OnboardingStepStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#94A3B8" },
  in_progress: { label: "In Progress", color: "#2563EB" },
  completed: { label: "Completed", color: "#059669" },
  skipped: { label: "Skipped", color: "#CBD5E1" },
};

export const TRAINING_STATUS_META: Record<TrainingSessionStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  scheduled: { label: "Scheduled", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
  rescheduled: { label: "Rescheduled", variant: "warning" },
};

// Department colour coding for training cards
export const DEPARTMENT_COLOR: Record<string, string> = {
  Admin: "#2563EB",
  Sales: "#7C3AED",
  Operations: "#0891B2",
  Wiring: "#D97706",
  Installation: "#059669",
};

export function departmentColor(dept: string | null | undefined): string {
  if (!dept) return "#64748B";
  return DEPARTMENT_COLOR[dept] ?? "#64748B";
}

// Progress bar colour: red < 25, amber 25–75, green > 75
export function progressColor(pct: number): string {
  if (pct < 25) return "#DC2626";
  if (pct <= 75) return "#D97706";
  return "#059669";
}
