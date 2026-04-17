create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('user', 'consultant', 'admin')),
  consultant_id text,
  is_active boolean not null default true
);

create table if not exists consultant_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  title text not null,
  focus_label text not null,
  specialties jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists consultants (
  id text primary key,
  name text not null,
  title text not null,
  focus_label text not null,
  specialties jsonb not null default '[]'::jsonb
);

create table if not exists leads (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references users (id),
  status text not null,
  assigned_consultant_id text references consultants (id),
  source_channel text,
  effective_channel text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  entry_path text,
  landing_url text,
  referrer text,
  priority text,
  grade text,
  answers jsonb not null,
  result jsonb not null,
  assignment jsonb not null,
  student jsonb,
  case_record jsonb,
  questionnaire_response jsonb,
  diagnostic_job jsonb,
  diagnostic_result jsonb,
  current_report jsonb,
  report_versions jsonb,
  consultation_request jsonb,
  admin_follow_up_record jsonb
);

create table if not exists follow_ups (
  id uuid primary key,
  lead_id uuid not null references leads (id) on delete cascade,
  created_at timestamptz not null default now(),
  author text not null,
  note text not null
);

create table if not exists lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  consultant_id uuid not null references users (id),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references users (id),
  status text not null default 'active' check (status in ('active', 'completed', 'transferred')),
  unique (lead_id, consultant_id)
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete cascade,
  lead_id uuid references leads (id) on delete set null,
  child_name text not null,
  current_grade_raw text,
  current_city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid unique references leads (id) on delete cascade,
  user_id uuid references users (id) on delete cascade,
  student_id uuid references students (id) on delete set null,
  status text not null,
  assigned_consultant_id text references consultants (id),
  current_report_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases (id) on delete cascade,
  lead_id uuid references leads (id) on delete cascade,
  response_json jsonb not null,
  version text,
  is_latest boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists diagnostic_jobs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases (id) on delete cascade,
  lead_id uuid references leads (id) on delete cascade,
  response_id uuid references questionnaire_responses (id) on delete set null,
  job_status text not null check (job_status in ('queued', 'running', 'succeeded', 'failed')),
  version_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists diagnostic_results (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases (id) on delete cascade,
  lead_id uuid references leads (id) on delete cascade,
  job_id uuid references diagnostic_jobs (id) on delete cascade,
  rule_result_json jsonb not null default '{}'::jsonb,
  school_data_snapshot_json jsonb not null default '{}'::jsonb,
  recommendation_tags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases (id) on delete cascade,
  lead_id uuid references leads (id) on delete cascade,
  job_id uuid references diagnostic_jobs (id) on delete set null,
  report_version int not null,
  report_type text not null check (report_type in ('ai_draft', 'consultant_final')),
  content_markdown text not null,
  summary_json jsonb not null default '{}'::jsonb,
  is_visible_to_user boolean not null default true,
  viewed_at timestamptz,
  created_by uuid references users (id),
  created_at timestamptz not null default now(),
  unique (case_id, report_version)
);

create table if not exists admin_follow_up_records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid unique references cases (id) on delete cascade,
  lead_id uuid unique references leads (id) on delete cascade,
  admin_user_id uuid references users (id),
  status text,
  intent_level text,
  target_timeline text,
  budget_level text,
  follow_up_notes jsonb not null default '[]'::jsonb,
  handoff_summary text,
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists consultation_requests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases (id) on delete cascade,
  lead_id uuid references leads (id) on delete cascade,
  request_status text not null default 'submitted',
  contact_time_preference text,
  notes text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_users_email on users (email);
create index if not exists idx_users_role on users (role);
create index if not exists idx_leads_user_id on leads (user_id);
create index if not exists idx_leads_created_at on leads (created_at desc);
create index if not exists idx_leads_status on leads (status);
create index if not exists idx_leads_effective_channel on leads (effective_channel);
create index if not exists idx_follow_ups_lead_id on follow_ups (lead_id, created_at desc);
create index if not exists idx_lead_assignments_lead_id on lead_assignments (lead_id);
create index if not exists idx_lead_assignments_consultant_id on lead_assignments (consultant_id);
create index if not exists idx_students_user_id on students (user_id);
create index if not exists idx_cases_user_id on cases (user_id);
create index if not exists idx_cases_status on cases (status);
create index if not exists idx_questionnaire_responses_case_id on questionnaire_responses (case_id, created_at desc);
create index if not exists idx_diagnostic_jobs_status on diagnostic_jobs (job_status);
create index if not exists idx_reports_case_id on reports (case_id, created_at desc);
create index if not exists idx_consultation_requests_case_id on consultation_requests (case_id, submitted_at desc);

alter table users enable row level security;
alter table consultant_profiles enable row level security;
alter table consultants enable row level security;
alter table leads enable row level security;
alter table follow_ups enable row level security;
alter table lead_assignments enable row level security;
alter table students enable row level security;
alter table cases enable row level security;
alter table questionnaire_responses enable row level security;
alter table diagnostic_jobs enable row level security;
alter table diagnostic_results enable row level security;
alter table reports enable row level security;
alter table admin_follow_up_records enable row level security;
alter table consultation_requests enable row level security;

drop policy if exists "Users can view own profile" on users;
create policy "Users can view own profile" on users
  for select using (auth.uid() = id);

drop policy if exists "Admins can view all users" on users;
create policy "Admins can view all users" on users
  for all using (
    exists (
      select 1 from users u where u.id = auth.uid() and u.role = 'admin'
    )
  );

drop policy if exists "Consultants can view own profile" on consultant_profiles;
create policy "Consultants can view own profile" on consultant_profiles
  for select using (user_id = auth.uid());

drop policy if exists "Users can view own leads" on leads;
create policy "Users can view own leads" on leads
  for select using (
    user_id = auth.uid() or
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists "Consultants can view assigned leads" on leads;
create policy "Consultants can view assigned leads" on leads
  for select using (
    exists (
      select 1 from lead_assignments la
      where la.lead_id = leads.id and la.consultant_id = auth.uid()
    ) or
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists "Admins can manage all leads" on leads;
create policy "Admins can manage all leads" on leads
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists "Admins can manage assignments" on lead_assignments;
create policy "Admins can manage assignments" on lead_assignments
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists "Admins can manage follow_ups" on follow_ups;
create policy "Admins can manage follow_ups" on follow_ups
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists "Consultants can manage assigned follow_ups" on follow_ups;
create policy "Consultants can manage assigned follow_ups" on follow_ups
  for all using (
    exists (
      select 1 from lead_assignments la
      where la.lead_id = follow_ups.lead_id and la.consultant_id = auth.uid()
    ) or
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );
