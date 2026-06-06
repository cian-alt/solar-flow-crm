-- Solar Flow CRM - Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable extensions
create extension if not exists "uuid-ossp";

-- =====================
-- PROFILES
-- =====================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role_title text,
  role text not null default 'account_manager' check (role in ('admin','sales_manager','account_manager')),
  avatar_url text,
  avatar_initials text,
  notification_preferences jsonb not null default '{
    "follow_up_due": true,
    "stage_change": true,
    "note_added": true,
    "document_uploaded": true,
    "task_due": true,
    "stale_lead": true
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_initials)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data->>'full_name', new.email), 1))
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================
-- LEADS
-- =====================
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text not null,
  phone text,
  email text,
  address text,
  eircode text,
  company_size text check (company_size in ('1-10','11-50','51-200','201-500','500+')),
  deal_value numeric(12,2),
  system_size_kw numeric(8,2),
  lead_source text check (lead_source in ('Website','Referral','Cold Call','LinkedIn','Trade Show','Google Ads','Facebook Ads','Partner','Other')),
  stage text not null default 'New Lead' check (stage in ('New Lead','Cold Called','Pending Demo','Demo Scheduled','Demo Done','Proposal Sent','Closed Won','Closed Lost')),
  assigned_to uuid references public.profiles(id),
  follow_up_date date,
  lead_score integer not null default 0 check (lead_score >= 0 and lead_score <= 100),
  is_stale boolean not null default false,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "Authenticated users can view leads" on public.leads
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert leads" on public.leads
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update leads" on public.leads
  for update using (auth.role() = 'authenticated');

create policy "Admins can delete leads" on public.leads
  for delete using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','sales_manager')
    )
  );

-- Indexes
create index if not exists leads_stage_idx on public.leads(stage);
create index if not exists leads_assigned_to_idx on public.leads(assigned_to);
create index if not exists leads_follow_up_date_idx on public.leads(follow_up_date);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_company_name_idx on public.leads using gin(to_tsvector('english', company_name));

-- =====================
-- NOTES
-- =====================
create table if not exists public.notes (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "Authenticated users can manage notes" on public.notes
  for all using (auth.role() = 'authenticated');

-- =====================
-- ACTIVITIES
-- =====================
create table if not exists public.activities (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;

create policy "Authenticated users can view activities" on public.activities
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert activities" on public.activities
  for insert with check (auth.role() = 'authenticated');

create index if not exists activities_lead_id_idx on public.activities(lead_id, created_at desc);

-- =====================
-- CALLS
-- =====================
create table if not exists public.calls (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  caller_id uuid not null references public.profiles(id),
  outcome text not null check (outcome in ('answered','voicemail','no_answer','callback_requested','not_interested','interested')),
  duration_minutes integer,
  notes text,
  called_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.calls enable row level security;

create policy "Authenticated users can manage calls" on public.calls
  for all using (auth.role() = 'authenticated');

-- =====================
-- TASKS
-- =====================
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references public.leads(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id),
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Authenticated users can manage tasks" on public.tasks
  for all using (auth.role() = 'authenticated');

create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to, completed, due_date);

-- =====================
-- DOCUMENTS
-- =====================
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  name text not null,
  file_url text not null,
  file_size integer,
  file_type text,
  document_type text not null default 'other' check (document_type in ('proposal','contract','invoice','design','other')),
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Authenticated users can manage documents" on public.documents
  for all using (auth.role() = 'authenticated');

-- =====================
-- NOTIFICATIONS
-- =====================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('follow_up_due','stage_change','note_added','document_uploaded','task_due','stale_lead')),
  title text not null,
  message text not null,
  lead_id uuid references public.leads(id) on delete set null,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

create policy "System can insert notifications" on public.notifications
  for insert with check (auth.role() = 'authenticated');

create index if not exists notifications_user_id_idx on public.notifications(user_id, read, created_at desc);

-- =====================
-- REALTIME
-- =====================
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.activities;

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger handle_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.leads
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.notes
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.tasks
  for each row execute procedure public.handle_updated_at();

-- =====================
-- STORAGE BUCKET FOR DOCUMENTS
-- =====================
-- Run this separately or via Supabase dashboard:
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
-- create policy "Authenticated users can upload" on storage.objects for insert with check (bucket_id = 'documents' and auth.role() = 'authenticated');
-- create policy "Authenticated users can read" on storage.objects for select using (bucket_id = 'documents' and auth.role() = 'authenticated');

-- =====================
-- CONTRACT TABLES
-- =====================
-- Run these in your Supabase SQL editor after applying the main schema above.

create type public.payment_type as enum ('monthly', 'upfront');

create table if not exists public.contracts (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  onboarding_fee numeric(12,2) default null,
  payment_type public.payment_type not null default 'monthly',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

alter table public.contracts enable row level security;
create policy "Authenticated users can manage contracts"
  on public.contracts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create table if not exists public.contract_phases (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  monthly_price numeric(12,2) not null default 0,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint contract_phases_dates_check check (end_date >= start_date)
);

alter table public.contract_phases enable row level security;
create policy "Authenticated users can manage contract phases"
  on public.contract_phases for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create index if not exists idx_contracts_lead_id on public.contracts(lead_id);
create index if not exists idx_contract_phases_contract_id on public.contract_phases(contract_id);

create trigger handle_updated_at before update on public.contracts
  for each row execute procedure public.handle_updated_at();

-- =====================
-- HR MODULE TABLES
-- =====================

-- Extend notifications type constraint to support HR notification types
-- (Drop and recreate the check constraint if it exists)
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'follow_up_due','stage_change','note_added','document_uploaded','task_due','stale_lead',
    'leave_request','leave_approved','leave_rejected','commission_paid','review_shared'
  ));

-- employee_profiles — one row per employee, keyed by profiles.id
create table if not exists public.employee_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  employee_number text not null,
  job_title text,
  department text not null default 'Sales',
  start_date date,
  base_salary numeric(12,2),
  payroll_frequency text not null default 'monthly',
  onboarding_commission_rate numeric(5,2) not null default 40,
  retention_commission_rate numeric(5,2) not null default 5,
  annual_leave_entitlement integer not null default 20,
  sick_leave_entitlement integer not null default 10,
  emergency_contact_name text,
  emergency_contact_phone text,
  iban text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_number)
);

alter table public.employee_profiles enable row level security;
create policy "Admins manage employee profiles"
  on public.employee_profiles for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or auth.uid() = id
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create trigger handle_updated_at before update on public.employee_profiles
  for each row execute procedure public.handle_updated_at();

-- commission_records
create type if not exists public.commission_type_enum as enum ('onboarding', 'retention');

create table if not exists public.commission_records (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  commission_type public.commission_type_enum not null,
  amount numeric(12,2) not null default 0,
  month_year date not null,
  is_paid boolean not null default false,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.commission_records enable row level security;
create policy "Admins manage commissions; employees view own"
  on public.commission_records for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or auth.uid() = employee_id
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create index if not exists idx_commission_employee on public.commission_records(employee_id);
create index if not exists idx_commission_month on public.commission_records(month_year);

-- leave_requests
create type if not exists public.leave_type_enum as enum (
  'annual','sick','unpaid','maternity','paternity','parents','force_majeure','compassionate'
);
create type if not exists public.leave_status_enum as enum ('pending','approved','rejected');

create table if not exists public.leave_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  leave_type public.leave_type_enum not null,
  start_date date not null,
  end_date date not null,
  days_requested integer not null default 1,
  status public.leave_status_enum not null default 'pending',
  reason text,
  admin_notes text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  sick_note_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_dates_check check (end_date >= start_date)
);

alter table public.leave_requests enable row level security;
create policy "Admins manage all leave; employees manage own"
  on public.leave_requests for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or auth.uid() = employee_id
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or auth.uid() = employee_id
  );

create trigger handle_updated_at before update on public.leave_requests
  for each row execute procedure public.handle_updated_at();

create index if not exists idx_leave_employee on public.leave_requests(employee_id);
create index if not exists idx_leave_status on public.leave_requests(status);

-- payroll_records
create type if not exists public.payroll_status_enum as enum ('draft','approved','paid');

create table if not exists public.payroll_records (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  base_salary_portion numeric(12,2) not null default 0,
  onboarding_commission numeric(12,2) not null default 0,
  retention_commission numeric(12,2) not null default 0,
  total_gross numeric(12,2) not null default 0,
  total_net numeric(12,2),
  status public.payroll_status_enum not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payroll_records enable row level security;
create policy "Admins manage payroll; employees view own"
  on public.payroll_records for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or auth.uid() = employee_id
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create trigger handle_updated_at before update on public.payroll_records
  for each row execute procedure public.handle_updated_at();

create index if not exists idx_payroll_employee on public.payroll_records(employee_id);

-- performance_reviews
create type if not exists public.review_status_enum as enum ('draft','shared');

create table if not exists public.performance_reviews (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  review_period text not null,
  rating integer not null check (rating between 1 and 5),
  strengths text,
  improvements text,
  goals text,
  status public.review_status_enum not null default 'draft',
  created_at timestamptz not null default now()
);

alter table public.performance_reviews enable row level security;
create policy "Admins manage reviews; employees view shared own"
  on public.performance_reviews for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or (auth.uid() = employee_id and status = 'shared')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create index if not exists idx_reviews_employee on public.performance_reviews(employee_id);

-- Auto-generate employee_number function
create or replace function public.next_employee_number()
returns text language plpgsql as $$
declare
  n integer;
begin
  select count(*) + 1 into n from public.employee_profiles;
  return 'SF-' || lpad(n::text, 3, '0');
end;
$$;

-- =====================
-- LEAD INTELLIGENCE & SCORING
-- =====================
-- AI-powered lead intelligence fields. Run this block in your Supabase SQL editor.
-- Idempotent: safe to run on an existing leads table.

alter table public.leads
  add column if not exists contractor_type text,
  add column if not exists jobs_per_week integer,
  add column if not exists annual_turnover text,
  add column if not exists uses_existing_software boolean default false,
  add column if not exists existing_software_name text,
  add column if not exists linkedin_url text,
  add column if not exists linkedin_activity text,
  add column if not exists preferred_contact_method text,
  add column if not exists decision_maker_identified boolean default false,
  add column if not exists decision_maker_name text,
  add column if not exists decision_maker_linkedin text,
  add column if not exists num_employees integer,
  add column if not exists county text,
  add column if not exists researched_by uuid references public.profiles(id),
  add column if not exists researched_at timestamp with time zone,
  add column if not exists intelligence_score integer default 0,
  add column if not exists intelligence_category text default 'Cold',
  add column if not exists recommended_package text,
  add column if not exists recommended_onboarding text,
  add column if not exists estimated_mrr numeric default 0,
  add column if not exists recommended_contact_method text,
  add column if not exists ai_notes text;

-- Constrain enum-like columns (drop-then-add so re-runs are safe)
alter table public.leads drop constraint if exists leads_contractor_type_check;
alter table public.leads add constraint leads_contractor_type_check
  check (contractor_type is null or contractor_type in
    ('Electrical','Plumbing','General','Solar','HVAC','Mechanical','Fit-out','Civil','Multi-trade'));

alter table public.leads drop constraint if exists leads_annual_turnover_check;
alter table public.leads add constraint leads_annual_turnover_check
  check (annual_turnover is null or annual_turnover in
    ('Under €500k','€500k-€1M','€1M-€5M','€5M-€10M','Over €10M'));

alter table public.leads drop constraint if exists leads_linkedin_activity_check;
alter table public.leads add constraint leads_linkedin_activity_check
  check (linkedin_activity is null or linkedin_activity in
    ('Very Active','Active','Occasional','Inactive','No Profile'));

alter table public.leads drop constraint if exists leads_preferred_contact_method_check;
alter table public.leads add constraint leads_preferred_contact_method_check
  check (preferred_contact_method is null or preferred_contact_method in
    ('Phone','LinkedIn','Email','WhatsApp','In Person'));

alter table public.leads drop constraint if exists leads_intelligence_category_check;
alter table public.leads add constraint leads_intelligence_category_check
  check (intelligence_category is null or intelligence_category in
    ('Hot','Warm','Nurture','Cold'));

alter table public.leads drop constraint if exists leads_recommended_package_check;
alter table public.leads add constraint leads_recommended_package_check
  check (recommended_package is null or recommended_package in
    ('Starter','Professional','Enterprise'));

alter table public.leads drop constraint if exists leads_recommended_onboarding_check;
alter table public.leads add constraint leads_recommended_onboarding_check
  check (recommended_onboarding is null or recommended_onboarding in
    ('Basic','Pro','Premium'));

alter table public.leads drop constraint if exists leads_intelligence_score_check;
alter table public.leads add constraint leads_intelligence_score_check
  check (intelligence_score is null or (intelligence_score >= 0 and intelligence_score <= 100));

create index if not exists leads_intelligence_category_idx on public.leads(intelligence_category);
create index if not exists leads_intelligence_score_idx on public.leads(intelligence_score desc);
create index if not exists leads_county_idx on public.leads(county);
create index if not exists leads_contractor_type_idx on public.leads(contractor_type);

-- =====================
-- CUSTOMER ONBOARDING MODULE
-- =====================
-- Run this whole block in your Supabase SQL editor. Idempotent where practical.

-- Extend notification types for onboarding events
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'follow_up_due','stage_change','note_added','document_uploaded','task_due','stale_lead',
    'leave_request','leave_approved','leave_rejected','commission_paid','review_shared',
    'onboarding_created','onboarding_step_complete','training_scheduled','training_booked',
    'onboarding_overdue','onboarding_go_live'
  ));

-- ── onboardings ───────────────────────────────────────────────────────────────
create table if not exists public.onboardings (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references public.leads(id) on delete set null,
  deal_id uuid, -- no deals table yet; kept nullable for forward-compat
  client_company_name text not null,
  client_contact_name text,
  client_contact_email text,
  client_contact_phone text,
  onboarding_package text not null default 'Basic'
    check (onboarding_package in ('Basic','Pro','Premium')),
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','completed','on_hold')),
  assigned_am uuid references public.profiles(id),
  portal_token uuid not null unique default uuid_generate_v4(),
  portal_last_viewed timestamptz,
  departments jsonb not null default '["Admin","Sales","Operations","Installation"]'::jsonb,
  sla_signed boolean not null default false,
  sla_signed_at timestamptz,
  subscription_activated boolean not null default false,
  subscription_activated_at timestamptz,
  payment_link_sent boolean not null default false,
  payment_link_sent_at timestamptz,
  go_live_date date,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

alter table public.onboardings enable row level security;
create policy "Authenticated manage onboardings" on public.onboardings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists onboardings_status_idx on public.onboardings(status);
create index if not exists onboardings_assigned_am_idx on public.onboardings(assigned_am);
create index if not exists onboardings_portal_token_idx on public.onboardings(portal_token);

-- ── onboarding_steps ──────────────────────────────────────────────────────────
create table if not exists public.onboarding_steps (
  id uuid primary key default uuid_generate_v4(),
  onboarding_id uuid not null references public.onboardings(id) on delete cascade,
  step_type text not null
    check (step_type in ('sla_signing','payment','portal_activation','department_emails',
      'training_schedule','training_session','handover','go_live','account_setup','am_intro','custom')),
  title text not null,
  description text,
  department text,
  status text not null default 'pending'
    check (status in ('pending','in_progress','completed','skipped')),
  assigned_to uuid references public.profiles(id),
  due_date date,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.onboarding_steps enable row level security;
create policy "Authenticated manage onboarding steps" on public.onboarding_steps
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists onboarding_steps_onboarding_idx on public.onboarding_steps(onboarding_id, order_index);

-- ── training_sessions ─────────────────────────────────────────────────────────
create table if not exists public.training_sessions (
  id uuid primary key default uuid_generate_v4(),
  onboarding_id uuid not null references public.onboardings(id) on delete cascade,
  onboarding_step_id uuid references public.onboarding_steps(id) on delete set null,
  department text,
  session_type text not null default 'online' check (session_type in ('online','in_person','full_day_onsite')),
  session_number integer,
  title text not null,
  scheduled_date timestamptz,
  duration_minutes integer not null default 60,
  location_or_link text,
  trainer uuid references public.profiles(id),
  attendees text,
  status text not null default 'scheduled'
    check (status in ('scheduled','completed','cancelled','rescheduled')),
  client_can_book boolean not null default false,
  available_slots jsonb not null default '[]'::jsonb,
  notes text,
  recording_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.training_sessions enable row level security;
create policy "Authenticated manage training sessions" on public.training_sessions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists training_sessions_onboarding_idx on public.training_sessions(onboarding_id);

-- ── onboarding_documents ──────────────────────────────────────────────────────
create table if not exists public.onboarding_documents (
  id uuid primary key default uuid_generate_v4(),
  onboarding_id uuid not null references public.onboardings(id) on delete cascade,
  document_type text not null default 'other'
    check (document_type in ('sla','welcome_pack','training_guide','setup_guide','department_guide','other')),
  title text not null,
  file_url text not null,
  uploaded_by uuid references public.profiles(id),
  visible_to_client boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.onboarding_documents enable row level security;
create policy "Authenticated manage onboarding documents" on public.onboarding_documents
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists onboarding_documents_onboarding_idx on public.onboarding_documents(onboarding_id);

-- updated_at triggers
create trigger handle_updated_at before update on public.onboardings
  for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.onboarding_steps
  for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.training_sessions
  for each row execute procedure public.handle_updated_at();

-- =====================
-- CLIENT PORTAL RPCs (SECURITY DEFINER — token-scoped, callable by anon)
-- =====================

-- Read the full portal payload for a token (internal_notes excluded).
create or replace function public.portal_get_onboarding(p_token uuid)
returns json language sql security definer set search_path = public stable as $$
  select case when o.id is null then null else json_build_object(
    'onboarding', to_jsonb(o) - 'internal_notes',
    'am', (select json_build_object(
              'full_name', p.full_name, 'email', p.email,
              'avatar_initials', p.avatar_initials, 'role_title', p.role_title)
            from public.profiles p where p.id = o.assigned_am),
    'steps', (select coalesce(json_agg(s order by s.order_index), '[]')
              from public.onboarding_steps s where s.onboarding_id = o.id),
    'training', (select coalesce(json_agg(t order by t.scheduled_date nulls last), '[]')
                 from public.training_sessions t where t.onboarding_id = o.id),
    'documents', (select coalesce(json_agg(d order by d.created_at desc), '[]')
                  from public.onboarding_documents d
                  where d.onboarding_id = o.id and d.visible_to_client = true)
  ) end
  from public.onboardings o where o.portal_token = p_token;
$$;

-- Stamp portal_last_viewed.
create or replace function public.portal_log_view(p_token uuid)
returns void language sql security definer set search_path = public volatile as $$
  update public.onboardings set portal_last_viewed = now() where portal_token = p_token;
$$;

-- Client books a bookable training slot.
create or replace function public.portal_book_slot(p_token uuid, p_session_id uuid, p_slot timestamptz)
returns json language plpgsql security definer set search_path = public volatile as $$
declare
  v_onb public.onboardings;
  v_sess public.training_sessions;
begin
  select * into v_onb from public.onboardings where portal_token = p_token;
  if v_onb.id is null then return json_build_object('ok', false, 'error', 'invalid token'); end if;

  select * into v_sess from public.training_sessions
    where id = p_session_id and onboarding_id = v_onb.id and client_can_book = true;
  if v_sess.id is null then return json_build_object('ok', false, 'error', 'session not bookable'); end if;

  update public.training_sessions
    set scheduled_date = p_slot, status = 'scheduled', client_can_book = false, updated_at = now()
    where id = p_session_id;

  if v_onb.assigned_am is not null then
    insert into public.notifications (user_id, type, title, message, lead_id)
    values (v_onb.assigned_am, 'training_booked', 'Client booked a training slot',
      v_onb.client_company_name || ' booked ' || coalesce(v_sess.title, 'a session'), v_onb.lead_id);
  end if;
  return json_build_object('ok', true);
end;
$$;

-- Client signs the SLA from the portal.
create or replace function public.portal_sign_sla(p_token uuid)
returns json language plpgsql security definer set search_path = public volatile as $$
declare
  v_onb public.onboardings;
begin
  select * into v_onb from public.onboardings where portal_token = p_token;
  if v_onb.id is null then return json_build_object('ok', false, 'error', 'invalid token'); end if;

  update public.onboardings set sla_signed = true, sla_signed_at = now(), updated_at = now()
    where id = v_onb.id;
  update public.onboarding_steps
    set status = 'completed', completed_at = now(), updated_at = now()
    where onboarding_id = v_onb.id and step_type = 'sla_signing' and status <> 'completed';

  if v_onb.assigned_am is not null then
    insert into public.notifications (user_id, type, title, message, lead_id)
    values (v_onb.assigned_am, 'onboarding_step_complete', 'SLA signed',
      v_onb.client_company_name || ' signed the SLA', v_onb.lead_id);
  end if;
  return json_build_object('ok', true);
end;
$$;

grant execute on function public.portal_get_onboarding(uuid) to anon, authenticated;
grant execute on function public.portal_log_view(uuid) to anon, authenticated;
grant execute on function public.portal_book_slot(uuid, uuid, timestamptz) to anon, authenticated;
grant execute on function public.portal_sign_sla(uuid) to anon, authenticated;

-- =====================
-- ONBOARDING PACKAGE CORRECTIONS (run on existing databases)
-- =====================
-- Allow the full-day on-site training session type.
alter table public.training_sessions drop constraint if exists training_sessions_session_type_check;
alter table public.training_sessions add constraint training_sessions_session_type_check
  check (session_type in ('online','in_person','full_day_onsite'));

-- Rename the default department set (Wiring → Installation) for new onboardings.
alter table public.onboardings
  alter column departments set default '["Admin","Sales","Operations","Installation"]'::jsonb;

-- =====================
-- CLOSE DEAL FLOW — contract deal/SLA fields (run on existing databases)
-- =====================
alter table public.contracts
  add column if not exists subscription_package text,
  add column if not exists monthly_amount numeric(12,2),
  add column if not exists contract_duration_months integer,
  add column if not exists start_date date,
  add column if not exists subscription_discount boolean not null default false,
  add column if not exists subscription_original_amount numeric(12,2),
  add column if not exists subscription_discount_reason text,
  add column if not exists onboarding_package text,
  add column if not exists onboarding_discount boolean not null default false,
  add column if not exists onboarding_original_fee numeric(12,2),
  add column if not exists onboarding_discount_reason text,
  add column if not exists official_company_name text,
  add column if not exists company_address text,
  add column if not exists eircode text,
  add column if not exists vat_number text,
  add column if not exists sla_status text not null default 'draft',
  add column if not exists sla_document_url text,
  add column if not exists onboarding_id uuid references public.onboardings(id) on delete set null,
  add column if not exists is_draft boolean not null default false;

alter table public.contracts drop constraint if exists contracts_subscription_package_check;
alter table public.contracts add constraint contracts_subscription_package_check
  check (subscription_package is null or subscription_package in ('Starter','Professional','Enterprise'));

alter table public.contracts drop constraint if exists contracts_onboarding_package_check;
alter table public.contracts add constraint contracts_onboarding_package_check
  check (onboarding_package is null or onboarding_package in ('Basic','Pro','Premium'));

alter table public.contracts drop constraint if exists contracts_sla_status_check;
alter table public.contracts add constraint contracts_sla_status_check
  check (sla_status in ('draft','sent','signed'));

-- =====================
-- SLA SIGNING (run on existing databases)
-- =====================
alter table public.contracts
  add column if not exists sign_token uuid not null default uuid_generate_v4(),
  add column if not exists signed_at timestamptz,
  add column if not exists signer_name text,
  add column if not exists signer_title text,
  add column if not exists signer_ip text,
  add column if not exists signature_url text,
  add column if not exists viewed_at timestamptz,
  add column if not exists special_conditions text;

create unique index if not exists contracts_sign_token_idx on public.contracts(sign_token);

-- Public (anon) signing RPCs — token-scoped, SECURITY DEFINER.
create or replace function public.sign_get_contract(p_token uuid)
returns json language sql security definer set search_path = public stable as $$
  select case when c.id is null then null else json_build_object(
    'contract', to_jsonb(c),
    'phases', (select coalesce(json_agg(p order by p.start_date), '[]') from public.contract_phases p where p.contract_id = c.id),
    'company', coalesce(c.official_company_name, l.company_name),
    'lead', json_build_object('company_name', l.company_name, 'contact_name', l.contact_name, 'email', l.email, 'phone', l.phone),
    'am', (select json_build_object('full_name', pr.full_name, 'email', pr.email, 'avatar_initials', pr.avatar_initials) from public.profiles pr where pr.id = l.assigned_to),
    'onboarding', (select json_build_object('id', o.id, 'sla_signed', o.sla_signed) from public.onboardings o where o.id = c.onboarding_id)
  ) end
  from public.contracts c join public.leads l on l.id = c.lead_id
  where c.sign_token = p_token;
$$;

create or replace function public.sign_log_view(p_token uuid)
returns void language sql security definer set search_path = public volatile as $$
  update public.contracts set viewed_at = now() where sign_token = p_token and viewed_at is null;
$$;

create or replace function public.sign_submit_sla(p_token uuid, p_name text, p_title text, p_signature_url text, p_ip text)
returns json language plpgsql security definer set search_path = public volatile as $$
declare c public.contracts; am public.profiles;
begin
  select * into c from public.contracts where sign_token = p_token;
  if c.id is null then return json_build_object('ok', false, 'error', 'invalid token'); end if;

  update public.contracts
    set signed_at = now(), signer_name = p_name, signer_title = p_title, signer_ip = p_ip,
        signature_url = p_signature_url, sla_status = 'signed', updated_at = now()
    where id = c.id;

  if c.onboarding_id is not null then
    update public.onboardings set sla_signed = true, sla_signed_at = now(), updated_at = now() where id = c.onboarding_id;
    update public.onboarding_steps set status = 'completed', completed_at = now(), updated_at = now()
      where onboarding_id = c.onboarding_id and step_type = 'sla_signing' and status <> 'completed';
  end if;

  select p.* into am from public.profiles p join public.leads l on l.assigned_to = p.id where l.id = c.lead_id;

  insert into public.notifications (user_id, type, title, message, lead_id)
    select id, 'onboarding_step_complete', 'SLA signed ✍️', coalesce(c.official_company_name, 'A client') || ' has signed their SLA!', c.lead_id
    from public.profiles where role = 'admin';

  return json_build_object('ok', true, 'company', coalesce(c.official_company_name, ''), 'am_name', am.full_name, 'am_email', am.email);
end;
$$;

grant execute on function public.sign_get_contract(uuid) to anon, authenticated;
grant execute on function public.sign_log_view(uuid) to anon, authenticated;
grant execute on function public.sign_submit_sla(uuid, text, text, text, text) to anon, authenticated;
