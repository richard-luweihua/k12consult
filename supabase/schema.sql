create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 1) users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  role varchar(50) not null default 'parent_user'
    check (role in ('parent_user', 'consultant', 'admin', 'super_admin')),
  mobile varchar(32) unique,
  email varchar(128) unique,
  wechat_id varchar(64) unique,
  password_hash varchar(255),
  mobile_verified_at timestamptz,
  email_verified_at timestamptz,
  status varchar(20) not null default 'active'
    check (status in ('active', 'disabled', 'pending')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) user_identities
create table if not exists user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  identity_type varchar(20) not null check (identity_type in ('mobile', 'email', 'wechat')),
  identity_value varchar(100) not null,
  is_primary boolean not null default false,
  is_verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identity_type, identity_value)
);

-- 3) user_sessions
create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_token_hash varchar(255) unique,
  device_id varchar(128),
  device_info varchar(255),
  ip_address varchar(45),
  status varchar(20) not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) login_challenges
create table if not exists login_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  identity_type varchar(20) not null check (identity_type in ('mobile', 'email')),
  identity_value varchar(100) not null,
  challenge_type varchar(20) not null
    check (challenge_type in ('otp_login', 'otp_signup', 'risk_reauth')),
  code_hash varchar(255) not null,
  attempt_count int not null default 0,
  max_attempts int not null default 5,
  status varchar(20) not null default 'issued'
    check (status in ('issued', 'verified', 'expired', 'blocked')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) user_profiles
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  name varchar(64),
  preferred_contact varchar(32),
  source_channel varchar(64),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6) consultant_profiles
create table if not exists consultant_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  display_name varchar(64),
  specialty_tags jsonb not null default '[]'::jsonb,
  bio text,
  active_status varchar(20) not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7) admin_profiles
create table if not exists admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  name varchar(64),
  admin_level varchar(32),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8) students
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  child_name varchar(64) not null,
  gender varchar(16),
  birth_year int,
  current_grade_raw varchar(64),
  current_city varchar(64),
  current_school_name varchar(128),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9) cases
create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  case_no varchar(64) unique not null,
  user_id uuid references users(id) on delete set null,
  student_id uuid references students(id) on delete set null,
  status varchar(50) not null default 'draft' check (
    status in (
      'draft',
      'contact_pending',
      'submitted',
      'processing',
      'report_ready',
      'report_viewed',
      'consult_intent_submitted',
      'admin_following',
      'awaiting_user_info',
      'consult_ready_for_assignment',
      'consult_assigned',
      'follow_up',
      'nurturing',
      'closed'
    )
  ),
  source_channel varchar(64),
  questionnaire_version varchar(32),
  current_report_id uuid,
  assigned_consultant_id uuid references users(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10) questionnaire_responses
create table if not exists questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  questionnaire_version varchar(32),
  response_json jsonb not null,
  is_locked boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 11) standardized_inputs
create table if not exists standardized_inputs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  questionnaire_response_id uuid not null references questionnaire_responses(id) on delete cascade,
  input_snapshot_json jsonb not null,
  normalization_version varchar(32),
  created_at timestamptz not null default now()
);

-- 12) diagnostic_jobs
create table if not exists diagnostic_jobs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  questionnaire_response_id uuid not null references questionnaire_responses(id) on delete cascade,
  standardized_input_id uuid references standardized_inputs(id) on delete set null,
  job_status varchar(20) not null default 'queued'
    check (job_status in ('queued', 'running', 'succeeded', 'failed', 'manual_review')),
  rule_version varchar(32),
  prompt_version varchar(32),
  model_name varchar(128),
  version_snapshot jsonb,
  retry_count int not null default 0,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- 13) diagnostic_results
create table if not exists diagnostic_results (
  id uuid primary key default gen_random_uuid(),
  diagnostic_job_id uuid not null references diagnostic_jobs(id) on delete cascade,
  rule_result_json jsonb,
  school_data_snapshot_json jsonb,
  risk_tags jsonb,
  path_tags jsonb,
  school_match_hint_json jsonb,
  consultation_recommendation varchar(32),
  created_at timestamptz not null default now()
);

-- 14) reports
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  diagnostic_job_id uuid references diagnostic_jobs(id) on delete set null,
  report_version int not null default 1,
  report_type varchar(20) not null default 'ai_draft'
    check (report_type in ('ai_draft', 'consultant_final')),
  content_json jsonb not null,
  summary_json jsonb,
  is_current boolean not null default true,
  is_visible_to_user boolean not null default true,
  viewed_at timestamptz,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (case_id, report_version)
);

-- 15) consultation_requests
create table if not exists consultation_requests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  request_status varchar(32) not null default 'submitted'
    check (request_status in (
      'submitted',
      'admin_following',
      'awaiting_user_info',
      'qualified',
      'nurturing',
      'assigned',
      'cancelled',
      'expired'
    )),
  contact_time_preference varchar(128),
  notes text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- current_report_id -> reports(id)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_cases_current_report_id'
  ) then
    alter table cases
      add constraint fk_cases_current_report_id
      foreign key (current_report_id) references reports(id) on delete set null;
  end if;
end $$;

-- indexes
create index if not exists idx_students_user_id on students(user_id);
create index if not exists idx_cases_student_status on cases(student_id, status);
create index if not exists idx_cases_user_id on cases(user_id);
create index if not exists idx_cases_status on cases(status);
create index if not exists idx_questionnaire_responses_case_id on questionnaire_responses(case_id);
create index if not exists idx_standardized_inputs_case_id on standardized_inputs(case_id);
create index if not exists idx_diagnostic_jobs_case_id on diagnostic_jobs(case_id);
create index if not exists idx_diagnostic_jobs_job_status on diagnostic_jobs(job_status);
create index if not exists idx_diagnostic_results_job_id on diagnostic_results(diagnostic_job_id);
create index if not exists idx_reports_case_id on reports(case_id);
create index if not exists idx_consultation_requests_case_id on consultation_requests(case_id);

-- RLS enabled (policies will be added in next phase)
alter table users enable row level security;
alter table user_identities enable row level security;
alter table user_sessions enable row level security;
alter table login_challenges enable row level security;
alter table user_profiles enable row level security;
alter table consultant_profiles enable row level security;
alter table admin_profiles enable row level security;
alter table students enable row level security;
alter table cases enable row level security;
alter table questionnaire_responses enable row level security;
alter table standardized_inputs enable row level security;
alter table diagnostic_jobs enable row level security;
alter table diagnostic_results enable row level security;
alter table reports enable row level security;
alter table consultation_requests enable row level security;
