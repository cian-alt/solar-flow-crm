import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type {
  Profile,
  EmployeeProfile,
  CommissionRecord,
  LeaveRequest,
  PayrollRecord,
} from "@/types/database";
import HROverviewClient from "@/components/hr/HROverviewClient";

export default async function HRPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.role !== "admin") redirect("/dashboard");

  const today = new Date();
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

  const [
    { data: profilesRaw },
    { data: employeeProfilesRaw },
    { data: pendingLeavesRaw },
    { data: commissionsRaw },
    { data: payrollRaw },
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("employee_profiles").select("*"),
    supabase
      .from("leave_requests")
      .select("*, employee:profiles!employee_id(id,full_name,avatar_initials,avatar_url,email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("commission_records")
      .select("*, lead:leads!lead_id(id,company_name)")
      .gte("month_year", monthStart)
      .lte("month_year", monthEnd),
    supabase
      .from("payroll_records")
      .select("*, employee:profiles!employee_id(id,full_name,avatar_initials)")
      .gte("period_start", monthStart)
      .order("period_start", { ascending: false }),
  ]);

  const profiles = (profilesRaw ?? []) as Profile[];
  const employeeProfiles = (employeeProfilesRaw ?? []) as EmployeeProfile[];
  const pendingLeaves = (pendingLeavesRaw ?? []) as LeaveRequest[];
  const commissions = (commissionsRaw ?? []) as CommissionRecord[];
  const payroll = (payrollRaw ?? []) as PayrollRecord[];

  // Build employee list with merged data
  const employees = profiles.map((p) => {
    const ep = employeeProfiles.find((e) => e.id === p.id) ?? null;
    const myCommissions = commissions.filter((c) => c.employee_id === p.id);
    const commissionsThisMonth = myCommissions.reduce((s, c) => s + (c.amount ?? 0), 0);
    return { profile: p, employeeProfile: ep, commissionsThisMonth };
  });

  const totalMonthlyPayroll = employees.reduce(
    (s, e) => s + (e.employeeProfile?.base_salary ?? 0) / 12,
    0
  );
  const outstandingCommissions = commissions
    .filter((c) => !c.is_paid)
    .reduce((s, c) => s + (c.amount ?? 0), 0);

  const summary = {
    headcount: profiles.length,
    totalMonthlyPayroll,
    outstandingCommissions,
    pendingLeaveCount: pendingLeaves.length,
  };

  return (
    <HROverviewClient
      employees={employees}
      pendingLeaves={pendingLeaves}
      payrollRecords={payroll}
      summary={summary}
    />
  );
}
