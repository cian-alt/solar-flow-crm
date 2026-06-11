import type { SupabaseClient } from "@supabase/supabase-js";
import type { Onboarding, OnboardingStep, TrainingSession, OnboardingDocument } from "@/types/database";

export interface OnboardingFull {
  onboarding: Onboarding;
  steps: OnboardingStep[];
  training: TrainingSession[];
  documents: OnboardingDocument[];
}

const ONB_SELECT = `*,
  am_profile:profiles!assigned_am(id,full_name,avatar_initials,avatar_url,email,role_title),
  steps:onboarding_steps(*, assignee:profiles!assigned_to(id,full_name,avatar_initials), completer:profiles!completed_by(id,full_name,avatar_initials)),
  training:training_sessions(*, trainer_profile:profiles!trainer(id,full_name,avatar_initials)),
  documents:onboarding_documents(*, uploader:profiles!uploaded_by(id,full_name,avatar_initials))`;

/**
 * Fetch an onboarding with its steps, training sessions and documents in ONE query,
 * returning the nested arrays sorted consistently.
 */
export async function fetchOnboardingFull(supabase: SupabaseClient, id: string): Promise<OnboardingFull | null> {
  const { data } = await supabase.from("onboardings").select(ONB_SELECT).eq("id", id).maybeSingle<
    Onboarding & { steps: OnboardingStep[]; training: TrainingSession[]; documents: OnboardingDocument[] }
  >();
  if (!data) return null;
  const { steps = [], training = [], documents = [], ...onboarding } = data;
  return {
    onboarding: onboarding as Onboarding,
    steps: [...steps].sort((a, b) => a.order_index - b.order_index),
    training: [...training].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "")),
    documents: [...documents].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
  };
}
