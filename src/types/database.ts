export type LeadStage =
  | "New Lead"
  | "Cold Called"
  | "Pending Demo"
  | "Demo Scheduled"
  | "Demo Done"
  | "Proposal Sent"
  | "Closed Won"
  | "Closed Lost";

export type LeadSource =
  | "Website"
  | "Referral"
  | "Cold Call"
  | "LinkedIn"
  | "Trade Show"
  | "Google Ads"
  | "Facebook Ads"
  | "Partner"
  | "Other";

export type CompanySize = "1-10" | "11-50" | "51-200" | "201-500" | "500+";

export type NotificationType =
  | "follow_up_due"
  | "stage_change"
  | "note_added"
  | "document_uploaded"
  | "task_due"
  | "stale_lead"
  | "leave_request"
  | "leave_approved"
  | "leave_rejected"
  | "commission_paid"
  | "review_shared";

export type TaskPriority = "low" | "medium" | "high";

export type CallOutcome =
  | "answered"
  | "voicemail"
  | "no_answer"
  | "callback_requested"
  | "not_interested"
  | "interested";

export type DocumentType =
  | "proposal"
  | "contract"
  | "invoice"
  | "design"
  | "other";

export type UserRole = "admin" | "sales_manager" | "account_manager";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role_title: string | null;
  role: UserRole;
  avatar_url: string | null;
  avatar_initials: string | null;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  follow_up_due: boolean;
  stage_change: boolean;
  note_added: boolean;
  document_uploaded: boolean;
  task_due: boolean;
  stale_lead: boolean;
}

export interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  eircode: string | null;
  company_size: CompanySize | null;
  deal_value: number | null;
  system_size_kw: number | null;
  lead_source: LeadSource | null;
  stage: LeadStage;
  assigned_to: string | null;
  follow_up_date: string | null;
  lead_score: number;
  is_stale: boolean;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_profile?: Profile;
}

export interface Note {
  id: string;
  lead_id: string;
  author_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface Activity {
  id: string;
  lead_id: string;
  user_id: string;
  type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: Profile;
}

export interface Call {
  id: string;
  lead_id: string;
  caller_id: string;
  outcome: CallOutcome;
  duration_minutes: number | null;
  notes: string | null;
  called_at: string;
  created_at: string;
  caller?: Profile;
}

export interface Task {
  id: string;
  lead_id: string;
  assigned_to: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
}

export interface Document {
  id: string;
  lead_id: string;
  uploaded_by: string;
  name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  document_type: DocumentType;
  created_at: string;
  uploader?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  lead_id: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
  lead?: Lead;
}

export type PaymentType = "monthly" | "upfront";

export interface Contract {
  id: string;
  lead_id: string;
  onboarding_fee: number | null;
  payment_type: PaymentType;
  created_at: string;
  updated_at: string;
  // Embedded
  phases?: ContractPhase[];
  lead?: Pick<Lead, 'id' | 'stage' | 'updated_at'>;
}

export interface ContractPhase {
  id: string;
  contract_id: string;
  monthly_price: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

// ── HR Module Types ───────────────────────────────────────────────────────────

export type CommissionType = "onboarding" | "retention";
export type LeaveType =
  | "annual"
  | "sick"
  | "unpaid"
  | "maternity"
  | "paternity"
  | "parents"
  | "force_majeure"
  | "compassionate";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type PayrollStatus = "draft" | "approved" | "paid";
export type ReviewStatus = "draft" | "shared";

export interface EmployeeProfile {
  id: string; // fk → profiles
  employee_number: string;
  job_title: string | null;
  department: string;
  start_date: string | null;
  base_salary: number | null;
  payroll_frequency: string;
  onboarding_commission_rate: number;
  retention_commission_rate: number;
  annual_leave_entitlement: number;
  sick_leave_entitlement: number;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  iban: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionRecord {
  id: string;
  employee_id: string;
  lead_id: string;
  contract_id: string | null;
  commission_type: CommissionType;
  amount: number;
  month_year: string;
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  // joined
  lead?: Pick<Lead, "id" | "company_name">;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: LeaveStatus;
  reason: string | null;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  sick_note_url: string | null;
  created_at: string;
  updated_at: string;
  // joined
  employee?: Pick<Profile, "id" | "full_name" | "avatar_initials" | "avatar_url" | "email">;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  base_salary_portion: number;
  onboarding_commission: number;
  retention_commission: number;
  total_gross: number;
  total_net: number | null;
  status: PayrollStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  employee?: Pick<Profile, "id" | "full_name" | "avatar_initials">;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id: string;
  review_period: string;
  rating: number;
  strengths: string | null;
  improvements: string | null;
  goals: string | null;
  status: ReviewStatus;
  created_at: string;
  reviewer?: Pick<Profile, "id" | "full_name" | "avatar_initials">;
}

// Dashboard types
export interface KPIData {
  total_revenue_all_time: number;
  total_revenue_this_month: number;
  active_leads_count: number;
  conversion_rate: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface LeadsByStage {
  stage: LeadStage;
  count: number;
  value: number;
}

export interface TopPerformer {
  profile: Profile;
  closed_won_count: number;
  revenue: number;
}
