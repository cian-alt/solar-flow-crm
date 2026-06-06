import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Onboarding, OnboardingStep, TrainingSession, OnboardingDocument, Profile } from "@/types/database";
import OnboardingDetailClient from "@/components/onboarding/OnboardingDetailClient";

export default async function OnboardingDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const [
    { data: onboarding },
    { data: steps },
    { data: training },
    { data: documents },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("onboardings").select("*, am_profile:profiles!assigned_am(id,full_name,avatar_initials,avatar_url,email,role_title)").eq("id", params.id).single<Onboarding>(),
    supabase.from("onboarding_steps").select("*, assignee:profiles!assigned_to(id,full_name,avatar_initials), completer:profiles!completed_by(id,full_name,avatar_initials)").eq("onboarding_id", params.id).order("order_index"),
    supabase.from("training_sessions").select("*, trainer_profile:profiles!trainer(id,full_name,avatar_initials)").eq("onboarding_id", params.id).order("created_at"),
    supabase.from("onboarding_documents").select("*, uploader:profiles!uploaded_by(id,full_name,avatar_initials)").eq("onboarding_id", params.id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("*"),
  ]);

  if (!onboarding) notFound();

  return (
    <OnboardingDetailClient
      onboarding={onboarding}
      initialSteps={(steps ?? []) as OnboardingStep[]}
      initialTraining={(training ?? []) as TrainingSession[]}
      initialDocuments={(documents ?? []) as OnboardingDocument[]}
      profiles={(profiles ?? []) as Profile[]}
    />
  );
}
