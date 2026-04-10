import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Lead, Profile, LeadStage } from "@/types/database";
import GreetingHeader from "@/components/dashboard/GreetingHeader";
import KPIGrid from "@/components/dashboard/KPIGrid";
import MonthlyRevenueChart from "@/components/dashboard/MonthlyRevenueChart";
import LeadsByStageChart from "@/components/dashboard/LeadsByStageChart";
import PipelineByStage from "@/components/dashboard/PipelineByStage";
import TopPerformers from "@/components/dashboard/TopPerformers";
import RecentActivity from "@/components/dashboard/RecentActivity";
import MyTasksToday from "@/components/dashboard/MyTasksToday";
import FollowUpsToday from "@/components/dashboard/FollowUpsToday";
import StaleLeads from "@/components/dashboard/StaleLeads";
import { startOfMonth, subMonths, format } from "date-fns";
import { contractRevenueForMonth, contractsTotalRevenue, type ContractForRevenue } from "@/lib/contractRevenue";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: leads },
    { data: profile },
    { data: activities },
    { data: tasks },
    { data: profiles },
    { data: contractsRaw },
  ] = await Promise.all([
    supabase.from("leads").select("*, assigned_profile:profiles!assigned_to(id,full_name,avatar_initials)"),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    supabase.from("activities").select("*, user:profiles!user_id(id,full_name,avatar_initials), lead:leads(id,company_name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("tasks").select("*, lead:leads(id,company_name)").eq("assigned_to", user.id).eq("completed", false).lte("due_date", new Date().toISOString().split("T")[0]),
    supabase.from("profiles").select("*"),
    supabase.from("contracts").select("id, lead_id, onboarding_fee, payment_type, phases:contract_phases(monthly_price, start_date, end_date), lead:leads!lead_id(id, stage, updated_at)"),
  ]);

  const allLeads = (leads ?? []) as Lead[];

  // Normalise contracts — treat as empty if the table doesn't exist yet or query fails
  const contracts: ContractForRevenue[] = (contractsRaw ?? []) as unknown as ContractForRevenue[];

  // ── KPIs from leads ────────────────────────────────────────────────
  const closedWon = allLeads.filter(l => l.stage === "Closed Won");
  const leadsRevenue = closedWon.reduce((s, l) => s + (l.deal_value ?? 0), 0);
  const totalRevenue = leadsRevenue + contractsTotalRevenue(contracts);

  // This month revenue
  const thisMonthStart = startOfMonth(new Date());
  const nextMonthStart = startOfMonth(subMonths(new Date(), -1));
  const leadsThisMonth = closedWon
    .filter(l => l.updated_at >= thisMonthStart.toISOString())
    .reduce((s, l) => s + (l.deal_value ?? 0), 0);
  const contractsThisMonth = contractRevenueForMonth(contracts, thisMonthStart, nextMonthStart);
  const revenueThisMonth = leadsThisMonth + contractsThisMonth;

  const activeLeads = allLeads.filter(l => l.stage !== "Closed Won" && l.stage !== "Closed Lost").length;
  const conversionRate = allLeads.length > 0 ? (closedWon.length / allLeads.length) * 100 : 0;

  // ── Monthly revenue chart (last 6 months) ─────────────────────────
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const mStart = startOfMonth(d);
    const mEnd = startOfMonth(subMonths(d, -1));
    const leadsRev = closedWon
      .filter(l => l.updated_at >= mStart.toISOString() && l.updated_at < mEnd.toISOString())
      .reduce((s, l) => s + (l.deal_value ?? 0), 0);
    const contractRev = contractRevenueForMonth(contracts, mStart, mEnd);
    return { month: format(d, "MMM"), revenue: leadsRev + contractRev };
  });

  // ── Leads by stage ─────────────────────────────────────────────────
  const stageMap = allLeads.reduce<Record<string, { count: number; value: number }>>((acc, l) => {
    if (!acc[l.stage]) acc[l.stage] = { count: 0, value: 0 };
    acc[l.stage].count++;
    acc[l.stage].value += l.deal_value ?? 0;
    return acc;
  }, {});

  const leadsByStage = Object.entries(stageMap).map(([stage, stats]) => ({
    stage: stage as LeadStage,
    count: stats.count,
    value: stats.value,
  }));

  // Today's follow-ups & stale
  const today = new Date().toISOString().split("T")[0];
  const followUpsToday = allLeads.filter(l => l.follow_up_date === today);
  const staleLeads = allLeads.filter(l => l.is_stale);

  // Top performers
  const perfMap = closedWon.reduce<Record<string, { closed_won_count: number; revenue: number }>>((acc, l) => {
    const id = l.assigned_to ?? "unassigned";
    if (!acc[id]) acc[id] = { closed_won_count: 0, revenue: 0 };
    acc[id].closed_won_count++;
    acc[id].revenue += l.deal_value ?? 0;
    return acc;
  }, {});

  const topPerformers = Object.entries(perfMap)
    .map(([id, stats]) => ({
      profile: (profiles ?? []).find((p: Profile) => p.id === id) ?? null,
      ...stats,
    }))
    .filter((p): p is typeof p & { profile: Profile } => p.profile !== null)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const firstName = profile?.full_name?.split(" ")[0] ?? null;

  return (
    <div className="space-y-6">
      <GreetingHeader firstName={firstName} />

      <KPIGrid
        totalRevenue={totalRevenue}
        revenueThisMonth={revenueThisMonth}
        activeLeads={activeLeads}
        conversionRate={conversionRate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyRevenueChart data={monthlyRevenue} />
        <LeadsByStageChart data={leadsByStage} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PipelineByStage data={leadsByStage} />
        <TopPerformers performers={topPerformers} />
        <RecentActivity activities={activities ?? []} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MyTasksToday tasks={tasks ?? []} />
        <FollowUpsToday leads={followUpsToday} />
        <StaleLeads leads={staleLeads} />
      </div>
    </div>
  );
}

