-- Phase 2: source connections, credentials, and documents for Krisp + Granola ingestion

create table public.source_connections (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  source_type    text not null check (source_type in ('krisp', 'granola')),
  display_name   text,
  status         text not null default 'active'
                   check (status in ('active', 'syncing', 'error', 'disconnected')),
  webhook_secret text,
  last_synced_at timestamptz,
  synced_count   int not null default 0,
  error_message  text,
  created_at     timestamptz not null default now(),
  unique(workspace_id, user_id, source_type)
);

-- Tokens stored separately — accessible via adminClient (service role) only
create table public.source_credentials (
  connection_id  uuid primary key references public.source_connections(id) on delete cascade,
  access_token   text not null,
  refresh_token  text,
  expires_at     timestamptz,
  token_type     text not null default 'api_key'
);

-- Every ingested transcript or note
create table public.source_documents (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid references public.source_connections(id) on delete set null,
  source_type   text not null,
  external_id   text not null,
  title         text,
  content       text not null,
  author_name   text,
  metadata      jsonb not null default '{}',
  processed     boolean not null default false,
  ingested_at   timestamptz not null default now(),
  unique(workspace_id, source_type, external_id)
);
