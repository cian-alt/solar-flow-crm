import { addDays, format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Lead,
  Onboarding,
  OnboardingPackage,
  OnboardingStep,
  OnboardingStepType,
  TrainingSessionType,
} from "@/types/database";

// ─────────────────────────────────────────────────────────────────────────────
// Package metadata (corrected onboarding packages)
// ─────────────────────────────────────────────────────────────────────────────

export const ONBOARDING_DEPARTMENTS = ["Admin", "Sales", "Operations", "Installation"] as const;

export interface PackageMeta {
  label: string;
  fee: number;
  badgeClass: string; // pkg-* class in globals.css
  summary: string;
}

export const PACKAGE_META: Record<OnboardingPackage, PackageMeta> = {
  Basic: {
    label: "Basic",
    fee: 0,
    badgeClass: "pkg-basic",
    summary: "45 min online setup call. Client self-trains afterwards. Dedicated AM.",
  },
  Pro: {
    label: "Pro",
    fee: 1500,
    badgeClass: "pkg-pro",
    summary: "Setup call + 8 online training sessions (2 per department). Dedicated AM.",
  },
  Premium: {
    label: "Premium",
    fee: 2500,
    badgeClass: "pkg-premium",
    summary: "Everything in Pro + a full-day on-site training visit. Dedicated AM.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Step templates per package
// ─────────────────────────────────────────────────────────────────────────────

export interface StepTemplate {
  step_type: OnboardingStepType;
  title: string;
  description: string;
  department: string | null;
  dueOffsetDays: number;
  // when set, a matching training_sessions row is generated
  training?: { session_type: TrainingSessionType; session_number: number | null };
}

const W = (weeks: number) => weeks * 7;

const COMMON_STEPS: StepTemplate[] = [
  { step_type: "sla_signing", title: "SLA Signing", description: "Client to sign Service Level Agreement", department: null, dueOffsetDays: 1 },
  { step_type: "payment", title: "Payment and Subscription Setup", description: "Send payment link, activate subscription", department: null, dueOffsetDays: 2 },
  { step_type: "department_emails", title: "Department Emails Collection", description: "Collect Admin, Sales, Operations, Installation team email addresses", department: null, dueOffsetDays: 3 },
];

// Account setup is a call, NOT a training session — it never generates a training_sessions row.
const ACCOUNT_SETUP: StepTemplate = {
  step_type: "account_setup",
  title: "Account Setup Call",
  description: "45 minute online onboarding & setup session",
  department: null,
  dueOffsetDays: 5,
};

function basicSteps(): StepTemplate[] {
  return [
    ...COMMON_STEPS,
    ACCOUNT_SETUP,
    { step_type: "am_intro", title: "Account Manager Introduction", description: "Introduce dedicated AM to client", department: null, dueOffsetDays: 5 },
    { step_type: "go_live", title: "Go Live", description: "Client is live on Solar Flow", department: null, dueOffsetDays: 7 },
  ];
}

// Shared by Pro and Premium: common steps + setup call + training schedule + 8 online sessions
// (2 per department). Department i runs sessions in weeks (2+i) and (3+i).
function trainingCore(): StepTemplate[] {
  const steps: StepTemplate[] = [
    ...COMMON_STEPS,
    ACCOUNT_SETUP,
    { step_type: "training_schedule", title: "Training Schedule Setup", description: "Confirm training schedule with client for each department", department: null, dueOffsetDays: W(1) },
  ];
  ONBOARDING_DEPARTMENTS.forEach((dept, i) => {
    for (let s = 1; s <= 2; s++) {
      steps.push({
        step_type: "training_session",
        title: `${dept} Team Training Session ${s} of 2`,
        description: `45 minute online training session ${s} of 2 for the ${dept} team`,
        department: dept,
        dueOffsetDays: W(2 + i + (s - 1)),
        training: { session_type: "online", session_number: s },
      });
    }
  });
  return steps;
}

function proSteps(): StepTemplate[] {
  return [
    ...trainingCore(),
    { step_type: "handover", title: "Handover and Ongoing Support", description: "Assign dedicated AM, confirm support process", department: null, dueOffsetDays: W(6) },
    { step_type: "go_live", title: "Go Live", description: "Client fully live on Solar Flow", department: null, dueOffsetDays: W(7) },
  ];
}

function premiumSteps(): StepTemplate[] {
  // Everything in Pro (steps 1–15) PLUS the on-site visit, a final handover and go-live.
  return [
    ...proSteps(),
    {
      step_type: "training_session",
      title: "Full Day On-Site Training Visit",
      description: "Solar Flow team travels to the client premises for a full day of in-person training",
      department: null,
      dueOffsetDays: W(8),
      training: { session_type: "full_day_onsite", session_number: null },
    },
    { step_type: "handover", title: "Handover and Ongoing Support", description: "Assign dedicated AM, confirm support process", department: null, dueOffsetDays: W(8) },
    { step_type: "go_live", title: "Go Live", description: "Client fully live on Solar Flow", department: null, dueOffsetDays: W(9) },
  ];
}

export function stepTemplatesFor(pkg: OnboardingPackage): StepTemplate[] {
  if (pkg === "Pro") return proSteps();
  if (pkg === "Premium") return premiumSteps();
  return basicSteps();
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress helpers
// ─────────────────────────────────────────────────────────────────────────────

export function onboardingProgress(steps: { status: string }[] | undefined): { completed: number; total: number; pct: number } {
  const total = steps?.length ?? 0;
  const completed = steps?.filter((s) => s.status === "completed").length ?? 0;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, pct };
}

export function isStepOverdue(step: { status: string; due_date: string | null }): boolean {
  if (step.status === "completed" || step.status === "skipped" || !step.due_date) return false;
  return step.due_date < format(new Date(), "yyyy-MM-dd");
}

/**
 * Keep onboarding_steps in sync with their linked training_sessions:
 * - session completed  → step completed (if not already)
 * - session scheduled with a date → step in_progress (only if still pending)
 * Guarded with filters so we never downgrade a manually-completed step.
 */
export async function syncStepsWithTraining(supabase: SupabaseClient, onboardingId: string): Promise<void> {
  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("onboarding_step_id, status, scheduled_date")
    .eq("onboarding_id", onboardingId);
  const now = new Date().toISOString();
  for (const s of (sessions ?? []) as { onboarding_step_id: string | null; status: string; scheduled_date: string | null }[]) {
    if (!s.onboarding_step_id) continue;
    if (s.status === "completed") {
      await supabase.from("onboarding_steps")
        .update({ status: "completed", completed_at: now, updated_at: now })
        .eq("id", s.onboarding_step_id).neq("status", "completed");
    } else if (s.scheduled_date) {
      await supabase.from("onboarding_steps")
        .update({ status: "in_progress", updated_at: now })
        .eq("id", s.onboarding_step_id).eq("status", "pending");
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications helper
// ─────────────────────────────────────────────────────────────────────────────

export async function notify(
  supabase: SupabaseClient,
  n: { user_id: string; type: string; title: string; message: string; lead_id?: string | null },
): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: n.user_id,
    type: n.type,
    title: n.title,
    message: n.message,
    lead_id: n.lead_id ?? null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Creation
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateOnboardingParams {
  leadId?: string | null;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  pkg: OnboardingPackage;
  assignedAm?: string | null;
  startDate?: Date;
}

export interface CreateOnboardingResult {
  onboarding?: Onboarding;
  steps?: OnboardingStep[];
  existed?: boolean;
  error?: string;
}

export async function createOnboarding(
  supabase: SupabaseClient,
  params: CreateOnboardingParams,
): Promise<CreateOnboardingResult> {
  const start = params.startDate ?? new Date();

  // De-dupe: one onboarding per lead.
  if (params.leadId) {
    const { data: existing } = await supabase
      .from("onboardings")
      .select("*")
      .eq("lead_id", params.leadId)
      .maybeSingle<Onboarding>();
    if (existing) return { onboarding: existing, existed: true };
  }

  const templates = stepTemplatesFor(params.pkg);
  // Use the LAST go-live step (Premium has an interim one at wk7 and the real one at wk9).
  const goLives = templates.filter((t) => t.step_type === "go_live");
  const goLive = goLives[goLives.length - 1];
  const goLiveDate = goLive ? format(addDays(start, goLive.dueOffsetDays), "yyyy-MM-dd") : null;

  const { data: onboarding, error: onbErr } = await supabase
    .from("onboardings")
    .insert({
      lead_id: params.leadId ?? null,
      client_company_name: params.companyName,
      client_contact_name: params.contactName ?? null,
      client_contact_email: params.email ?? null,
      client_contact_phone: params.phone ?? null,
      onboarding_package: params.pkg,
      status: "not_started",
      assigned_am: params.assignedAm ?? null,
      go_live_date: goLiveDate,
    })
    .select("*")
    .single<Onboarding>();

  if (onbErr || !onboarding) return { error: onbErr?.message ?? "Failed to create onboarding" };

  // Insert steps
  const stepRows = templates.map((t, idx) => ({
    onboarding_id: onboarding.id,
    step_type: t.step_type,
    title: t.title,
    description: t.description,
    department: t.department,
    status: "pending",
    due_date: format(addDays(start, t.dueOffsetDays), "yyyy-MM-dd"),
    order_index: idx,
  }));
  const { data: steps, error: stepErr } = await supabase
    .from("onboarding_steps")
    .insert(stepRows)
    .select("*");
  if (stepErr) return { onboarding, error: stepErr.message };

  // Insert training sessions for training-flagged templates, linked to their step.
  const insertedSteps = (steps ?? []) as OnboardingStep[];
  const trainingRows = templates
    .map((t, idx) => ({ t, step: insertedSteps.find((s) => s.order_index === idx) }))
    .filter(({ t }) => !!t.training)
    .map(({ t, step }) => ({
      onboarding_id: onboarding.id,
      onboarding_step_id: step?.id ?? null,
      department: t.department,
      session_type: t.training!.session_type,
      session_number: t.training!.session_number,
      title: t.title,
      duration_minutes: t.training!.session_type === "online" ? 45 : 480,
      status: "scheduled",
    }));
  if (trainingRows.length > 0) {
    await supabase.from("training_sessions").insert(trainingRows);
  }

  // Notify the assigned AM.
  if (params.assignedAm) {
    await notify(supabase, {
      user_id: params.assignedAm,
      type: "onboarding_created",
      title: "New onboarding assigned",
      message: `Onboarding started for ${params.companyName} (${params.pkg})`,
      lead_id: params.leadId ?? null,
    });
  }

  return { onboarding, steps: insertedSteps };
}

/**
 * Ensure an onboarding exists for a lead that has just reached Closed Won.
 * Package defaults to the lead's recommended onboarding, else Pro.
 */
export async function ensureOnboardingForLead(
  supabase: SupabaseClient,
  lead: Lead,
): Promise<CreateOnboardingResult> {
  const pkg: OnboardingPackage =
    lead.recommended_onboarding === "Basic" || lead.recommended_onboarding === "Pro" || lead.recommended_onboarding === "Premium"
      ? lead.recommended_onboarding
      : "Pro";
  return createOnboarding(supabase, {
    leadId: lead.id,
    companyName: lead.company_name,
    contactName: lead.contact_name,
    email: lead.email,
    phone: lead.phone,
    pkg,
    assignedAm: lead.assigned_to,
  });
}
