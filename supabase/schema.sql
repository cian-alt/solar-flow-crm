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
