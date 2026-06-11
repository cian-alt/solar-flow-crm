import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Profile } from "@/types/database";
import { fetchOnboardingFull } from "@/lib/queries/onboarding";
import OnboardingDetailClient from "@/components/onboarding/OnboardingDetailClient";

export default async function OnboardingDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  // Single joined query for the onboarding + steps + sessions + documents.
  const [full, { data: profiles }] = await Promise.all([
    fetchOnboardingFull(supabase, params.id),
    supabase.from("profiles").select("*"),
  ]);

  if (!full) notFound();

  return (
    <OnboardingDetailClient
      onboarding={full.onboarding}
      initialSteps={full.steps}
      initialTraining={full.training}
      initialDocuments={full.documents}
      profiles={(profiles ?? []) as Profile[]}
    />
  );
}
