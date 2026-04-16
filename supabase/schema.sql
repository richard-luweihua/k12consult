-- 用户表
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('user', 'consultant', 'admin')),
  is_active boolean not null default true
);

-- 顾问信息扩展
create table if not exists consultant_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  title text not null,
  focus_label text not null,
  specialties jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 修改leads表，添加user_id
alter table leads add column if not exists user_id uuid references users (id);

-- 线索分配表（顾问可见线索）
create table if not exists lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  consultant_id uuid not null references users (id),
  assigned_at timestamptz not null default now(),
  assigned_by uuid not null references users (id),
  status text not null default 'active' check (status in ('active', 'completed', 'transferred')),
  unique(lead_id, consultant_id)
);

-- 索引
create index if not exists idx_users_email on users (email);
create index if not exists idx_users_role on users (role);
create index if not exists idx_lead_assignments_lead_id on lead_assignments (lead_id);
create index if not exists idx_lead_assignments_consultant_id on lead_assignments (consultant_id);
create index if not exists idx_leads_user_id on leads (user_id);

-- RLS策略
alter table users enable row level security;
alter table consultant_profiles enable row level security;
alter table leads enable row level security;
alter table lead_assignments enable row level security;
alter table follow_ups enable row level security;

-- 用户可以查看自己的信息
create policy "Users can view own profile" on users
  for select using (auth.uid() = id);

-- 管理员可以查看所有用户
create policy "Admins can view all users" on users
  for all using (
    exists (
      select 1 from users u where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- 顾问可以查看自己的profile
create policy "Consultants can view own profile" on consultant_profiles
  for select using (
    user_id = auth.uid()
  );

-- 用户可以查看自己的leads
create policy "Users can view own leads" on leads
  for select using (
    user_id = auth.uid() or
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );

-- 顾问可以查看分配给自己的leads
create policy "Consultants can view assigned leads" on leads
  for select using (
    exists (
      select 1 from lead_assignments la
      where la.lead_id = leads.id and la.consultant_id = auth.uid()
    ) or
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );

-- 管理员可以管理所有数据
create policy "Admins can manage all data" on leads for all using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);

create policy "Admins can manage assignments" on lead_assignments for all using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);

create policy "Admins can manage follow_ups" on follow_ups for all using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);

-- 顾问可以管理分配给自己的follow_ups
create policy "Consultants can manage assigned follow_ups" on follow_ups
  for all using (
    exists (
      select 1 from lead_assignments la
      where la.lead_id = follow_ups.lead_id and la.consultant_id = auth.uid()
    ) or
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
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
