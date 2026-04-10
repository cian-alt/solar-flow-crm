import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Lead, Note, Activity, Call, Task, Document, Profile } from "@/types/database";
import LeadDetailClient from "@/components/lead-detail/LeadDetailClient";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const [
    { data: lead },
    { data: notes },
    { data: activities },
    { data: calls },
    { data: tasks },
    { data: documents },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("leads").select("*, assigned_profile:profiles!assigned_to(id,full_name,avatar_initials,email,role_title)").eq("id", params.id).single<Lead>(),
    supabase.from("notes").select("*, author:profiles!author_id(id,full_name,avatar_initials)").eq("lead_id", params.id).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("activities").select("*, user:profiles!user_id(id,full_name,avatar_initials)").eq("lead_id", params.id).order("created_at", { ascending: false }),
    supabase.from("calls").select("*, caller:profiles!caller_id(id,full_name,avatar_initials)").eq("lead_id", params.id).order("called_at", { ascending: false }),
    supabase.from("tasks").select("*, assignee:profiles!assigned_to(id,full_name,avatar_initials)").eq("lead_id", params.id).order("created_at", { ascending: false }),
    supabase.from("documents").select("*, uploader:profiles!uploaded_by(id,full_name,avatar_initials)").eq("lead_id", params.id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("*"),
  ]);

  if (!lead) notFound();

  return (
    <LeadDetailClient
      lead={lead}
      notes={(notes ?? []) as Note[]}
      activities={(activities ?? []) as Activity[]}
      calls={(calls ?? []) as Call[]}
      tasks={(tasks ?? []) as Task[]}
      documents={(documents ?? []) as Document[]}
      profiles={(profiles ?? []) as Profile[]}
    />
  );
}
