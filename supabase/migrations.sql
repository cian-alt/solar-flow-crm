-- ============================================================================
-- Solar Flow CRM — CONSOLIDATED FEATURE MIGRATION (idempotent)
-- ----------------------------------------------------------------------------
-- Paste this whole file into the Supabase SQL editor and Run.
-- Safe to run on a database that already has the base tables
-- (profiles, leads, notes, activities, calls, tasks, documents, notifications,
--  contracts, contract_phases, employee_profiles, commission_records, …).
-- Re-runnable: every statement is additive / guarded.
--
-- After running: create a PUBLIC storage bucket named "documents"
-- (Supabase → Storage → New bucket → name "documents", Public = on).
-- ============================================================================

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
drop policy if exists "Authenticated manage onboardings" on public.onboardings;
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
drop policy if exists "Authenticated manage onboarding steps" on public.onboarding_steps;
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
drop policy if exists "Authenticated manage training sessions" on public.training_sessions;
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
drop policy if exists "Authenticated manage onboarding documents" on public.onboarding_documents;
create policy "Authenticated manage onboarding documents" on public.onboarding_documents
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists onboarding_documents_onboarding_idx on public.onboarding_documents(onboarding_id);

-- updated_at triggers
drop trigger if exists handle_updated_at on public.onboardings;
create trigger handle_updated_at before update on public.onboardings
  for each row execute procedure public.handle_updated_at();
drop trigger if exists handle_updated_at on public.onboarding_steps;
create trigger handle_updated_at before update on public.onboarding_steps
  for each row execute procedure public.handle_updated_at();
drop trigger if exists handle_updated_at on public.training_sessions;
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

-- =====================
-- SLA HTML + status flow (run on existing databases)
-- =====================
alter table public.contracts add column if not exists sla_html text;

-- Allow the 'viewed' status (draft → sent → viewed → signed)
alter table public.contracts drop constraint if exists contracts_sla_status_check;
alter table public.contracts add constraint contracts_sla_status_check
  check (sla_status in ('draft','sent','viewed','signed'));

-- On first client view: stamp viewed_at and advance 'sent' → 'viewed'.
create or replace function public.sign_log_view(p_token uuid)
returns void language sql security definer set search_path = public volatile as $$
  update public.contracts
    set viewed_at = coalesce(viewed_at, now()),
        sla_status = case when sla_status = 'sent' then 'viewed' else sla_status end
    where sign_token = p_token;
$$;

-- On sign: also log a lead activity (attributed to the assigned AM).
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

  if am.id is not null then
    insert into public.activities (lead_id, user_id, type, description, metadata)
      values (c.lead_id, am.id, 'sla_signed', coalesce(c.official_company_name, 'Client') || ' signed the SLA', '{}'::jsonb);
  end if;

  insert into public.notifications (user_id, type, title, message, lead_id)
    select id, 'onboarding_step_complete', 'SLA signed ✍️', coalesce(c.official_company_name, 'A client') || ' has signed their SLA!', c.lead_id
    from public.profiles where role = 'admin';
  if am.id is not null then
    insert into public.notifications (user_id, type, title, message, lead_id)
      values (am.id, 'onboarding_step_complete', 'SLA signed ✍️', coalesce(c.official_company_name, 'Your client') || ' has signed their SLA!', c.lead_id);
  end if;

  return json_build_object('ok', true, 'company', coalesce(c.official_company_name, ''), 'am_name', am.full_name, 'am_email', am.email);
end;
$$;

grant execute on function public.sign_log_view(uuid) to anon, authenticated;
grant execute on function public.sign_submit_sla(uuid, text, text, text, text) to anon, authenticated;
