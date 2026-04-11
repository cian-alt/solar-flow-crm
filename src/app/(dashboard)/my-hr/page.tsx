import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  Profile,
  EmployeeProfile,
  CommissionRecord,
  LeaveRequest,
  PayrollRecord,
  PerformanceReview,
} from "@/types/database";
import MyHRClient from "@/components/my-hr/MyHRClient";

export default async function MyHRPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profileRaw },
    { data: epRaw },
    { data: commissionsRaw },
    { data: leavesRaw },
    { data: payrollRaw },
    { data: reviewsRaw },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("employee_profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("commission_records")
      .select("*, lead:leads!lead_id(id,company_name)")
      .eq("employee_id", user.id)
      .order("month_year", { ascending: false }),
    supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payroll_records")
      .select("*")
      .eq("employee_id", user.id)
      .order("period_start", { ascending: false }),
    supabase
      .from("performance_reviews")
      .select("*, reviewer:profiles!reviewer_id(id,full_name,avatar_initials)")
      .eq("employee_id", user.id)
      .eq("status", "shared")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <MyHRClient
      profile={profileRaw as Profile}
      employeeProfile={epRaw as EmployeeProfile | null}
      commissions={(commissionsRaw ?? []) as CommissionRecord[]}
      leaveRequests={(leavesRaw ?? []) as LeaveRequest[]}
      payrollRecords={(payrollRaw ?? []) as PayrollRecord[]}
      reviews={(reviewsRaw ?? []) as PerformanceReview[]}
    />
  );
}
