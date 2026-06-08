-- Foundation schema: workspaces, members, company profiles
-- Multi-tenant isolation enforced via Row Level Security on every table.

-- ============================================================
-- WORKSPACES
-- One row per company/team. The anchor of all tenant data.
-- ============================================================
create table public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create policy "authenticated users can create workspaces"
  on public.workspaces for insert
  with check (auth.uid() is not null);

create policy "members can view their workspace"
  on public.workspaces for select
  using (
    id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- ============================================================
-- WORKSPACE MEMBERS
-- Links auth.users to workspaces. The source of truth for
-- "which workspace does this user belong to?"
-- ============================================================
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'owner' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

create policy "users can view their own memberships"
  on public.workspace_members for select
  using (user_id = auth.uid());

create policy "users can insert their own membership"
  on public.workspace_members for insert
  with check (user_id = auth.uid());

-- ============================================================
-- COMPANY PROFILES
-- The system prompt, ICP, and target personas written during
-- onboarding. One profile per workspace.
-- ============================================================
create table public.company_profiles (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null unique references public.workspaces(id) on delete cascade,
  system_prompt    text,
  icp_description  text,
  target_personas  jsonb not null default '[]',
  updated_at       timestamptz not null default now()
);

alter table public.company_profiles enable row level security;

create policy "members can view their company profile"
  on public.company_profiles for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "members can insert their company profile"
  on public.company_profiles for insert
  with check (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "members can update their company profile"
  on public.company_profiles for update
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );
