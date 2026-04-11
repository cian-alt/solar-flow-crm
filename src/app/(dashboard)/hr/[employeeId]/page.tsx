import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type {
  Profile,
  EmployeeProfile,
  CommissionRecord,
  LeaveRequest,
  PayrollRecord,
  PerformanceReview,
} from "@/types/database";
import EmployeeDetailClient from "@/components/hr/EmployeeDetailClient";

export default async function EmployeeDetailPage({
  params,
}: {
  params: { employeeId: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.role !== "admin") redirect("/dashboard");

  const { employeeId } = params;

  const [
    { data: profileRaw },
    { data: epRaw },
    { data: commissionsRaw },
    { data: leavesRaw },
    { data: payrollRaw },
    { data: reviewsRaw },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", employeeId).maybeSingle(),
    supabase.from("employee_profiles").select("*").eq("id", employeeId).maybeSingle(),
    supabase
      .from("commission_records")
      .select("*, lead:leads!lead_id(id,company_name)")
      .eq("employee_id", employeeId)
      .order("month_year", { ascending: false }),
    supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("payroll_records")
      .select("*")
      .eq("employee_id", employeeId)
      .order("period_start", { ascending: false }),
    supabase
      .from("performance_reviews")
      .select("*, reviewer:profiles!reviewer_id(id,full_name,avatar_initials)")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false }),
  ]);

  if (!profileRaw) notFound();

  return (
    <EmployeeDetailClient
      profile={profileRaw as Profile}
      employeeProfile={epRaw as EmployeeProfile | null}
      commissions={(commissionsRaw ?? []) as CommissionRecord[]}
      leaveRequests={(leavesRaw ?? []) as LeaveRequest[]}
      payrollRecords={(payrollRaw ?? []) as PayrollRecord[]}
      reviews={(reviewsRaw ?? []) as PerformanceReview[]}
    />
  );
}
