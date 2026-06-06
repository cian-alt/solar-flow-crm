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

// ── Lead Intelligence enums ───────────────────────────────────────────────────
export type ContractorType =
  | "Electrical"
  | "Plumbing"
  | "General"
  | "Solar"
  | "HVAC"
  | "Mechanical"
  | "Fit-out"
  | "Civil"
  | "Multi-trade";

export type AnnualTurnover =
  | "Under €500k"
  | "€500k-€1M"
  | "€1M-€5M"
  | "€5M-€10M"
  | "Over €10M";

export type LinkedInActivity =
  | "Very Active"
  | "Active"
  | "Occasional"
  | "Inactive"
  | "No Profile";

export type ContactMethod =
  | "Phone"
  | "LinkedIn"
  | "Email"
  | "WhatsApp"
  | "In Person";

export type IntelligenceCategory = "Hot" | "Warm" | "Nurture" | "Cold";

export type RecommendedPackage = "Starter" | "Professional" | "Enterprise";

export type RecommendedOnboarding = "Basic" | "Pro" | "Premium";

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
  | "review_shared"
  | "onboarding_created"
  | "onboarding_step_complete"
  | "training_scheduled"
  | "training_booked"
  | "onboarding_overdue"
  | "onboarding_go_live";

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
  // ── Lead Intelligence research fields ──
  contractor_type: ContractorType | null;
  jobs_per_week: number | null;
  annual_turnover: AnnualTurnover | null;
  uses_existing_software: boolean | null;
  existing_software_name: string | null;
  linkedin_url: string | null;
  linkedin_activity: LinkedInActivity | null;
  preferred_contact_method: ContactMethod | null;
  decision_maker_identified: boolean | null;
  decision_maker_name: string | null;
  decision_maker_linkedin: string | null;
  num_employees: number | null;
  county: string | null;
  researched_by: string | null;
  researched_at: string | null;
  // ── AI-calculated intelligence fields ──
  intelligence_score: number | null;
  intelligence_category: IntelligenceCategory | null;
  recommended_package: RecommendedPackage | null;
  recommended_onboarding: RecommendedOnboarding | null;
  estimated_mrr: number | null;
  recommended_contact_method: string | null;
  ai_notes: string | null;
  // Joined
  assigned_profile?: Profile;
  researched_profile?: Profile;
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

export type SlaStatus = "draft" | "sent" | "signed";

export interface Contract {
  id: string;
  lead_id: string;
  onboarding_fee: number | null;
  payment_type: PaymentType;
  // ── Close-deal fields ──
  subscription_package: RecommendedPackage | null;
  monthly_amount: number | null;
  contract_duration_months: number | null;
  start_date: string | null;
  subscription_discount: boolean | null;
  subscription_original_amount: number | null;
  subscription_discount_reason: string | null;
  onboarding_package: OnboardingPackage | null;
  onboarding_discount: boolean | null;
  onboarding_original_fee: number | null;
  onboarding_discount_reason: string | null;
  official_company_name: string | null;
  company_address: string | null;
  eircode: string | null;
  vat_number: string | null;
  sla_status: SlaStatus | null;
  sla_document_url: string | null;
  onboarding_id: string | null;
  is_draft: boolean | null;
  // ── SLA signing ──
  sign_token: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signer_title: string | null;
  signer_ip: string | null;
  signature_url: string | null;
  viewed_at: string | null;
  special_conditions: string | null;
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

// ── Customer Onboarding module ────────────────────────────────────────────────

export type OnboardingPackage = "Basic" | "Pro" | "Premium";
export type OnboardingStatus = "not_started" | "in_progress" | "completed" | "on_hold";
export type OnboardingStepType =
  | "sla_signing"
  | "payment"
  | "portal_activation"
  | "department_emails"
  | "training_schedule"
  | "training_session"
  | "handover"
  | "go_live"
  | "account_setup"
  | "am_intro"
  | "custom";
export type OnboardingStepStatus = "pending" | "in_progress" | "completed" | "skipped";
export type TrainingSessionType = "online" | "in_person" | "full_day_onsite";
export type TrainingSessionStatus = "scheduled" | "completed" | "cancelled" | "rescheduled";
export type OnboardingDocumentType =
  | "sla"
  | "welcome_pack"
  | "training_guide"
  | "setup_guide"
  | "department_guide"
  | "other";

export interface Onboarding {
  id: string;
  lead_id: string | null;
  deal_id: string | null;
  client_company_name: string;
  client_contact_name: string | null;
  client_contact_email: string | null;
  client_contact_phone: string | null;
  onboarding_package: OnboardingPackage;
  status: OnboardingStatus;
  assigned_am: string | null;
  portal_token: string;
  portal_last_viewed: string | null;
  departments: string[];
  sla_signed: boolean;
  sla_signed_at: string | null;
  subscription_activated: boolean;
  subscription_activated_at: string | null;
  payment_link_sent: boolean;
  payment_link_sent_at: string | null;
  go_live_date: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined / computed
  am_profile?: Profile;
  steps?: OnboardingStep[];
  step_count?: number;
  completed_count?: number;
}

export interface OnboardingStep {
  id: string;
  onboarding_id: string;
  step_type: OnboardingStepType;
  title: string;
  description: string | null;
  department: string | null;
  status: OnboardingStepStatus;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
  completer?: Profile;
}

export interface TrainingSession {
  id: string;
  onboarding_id: string;
  onboarding_step_id: string | null;
  department: string | null;
  session_type: TrainingSessionType;
  session_number: number | null;
  title: string;
  scheduled_date: string | null;
  duration_minutes: number;
  location_or_link: string | null;
  trainer: string | null;
  attendees: string | null;
  status: TrainingSessionStatus;
  client_can_book: boolean;
  available_slots: string[];
  notes: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
  trainer_profile?: Profile;
}

export interface OnboardingDocument {
  id: string;
  onboarding_id: string;
  document_type: OnboardingDocumentType;
  title: string;
  file_url: string;
  uploaded_by: string | null;
  visible_to_client: boolean;
  created_at: string;
  uploader?: Profile;
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
