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
  assignment jsonb not null
);

create table if not exists follow_ups (
  id uuid primary key,
  lead_id uuid not null references leads (id) on delete cascade,
  created_at timestamptz not null default now(),
  author text not null,
  note text not null
);

create index if not exists idx_leads_created_at on leads (created_at desc);
create index if not exists idx_leads_status on leads (status);
create index if not exists idx_leads_effective_channel on leads (effective_channel);
create index if not exists idx_follow_ups_lead_id on follow_ups (lead_id, created_at desc);
