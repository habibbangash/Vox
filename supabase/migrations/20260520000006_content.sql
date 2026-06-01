-- author_profiles: per-user voice configuration for content generation
create table if not exists public.author_profiles (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  display_name  text not null,
  role          text,
  voice_notes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);
alter table public.author_profiles enable row level security;

-- enum types for content
create type public.content_format as enum ('linkedin_post', 'email_sequence', 'blog_post', 'battle_card');
create type public.draft_status   as enum ('brief', 'draft', 'review', 'published');

-- content_drafts: content pieces with full source provenance
create table if not exists public.content_drafts (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  author_profile_id uuid references public.author_profiles(id) on delete set null,
  format            public.content_format not null default 'linkedin_post',
  status            public.draft_status   not null default 'brief',
  title             text not null,
  brief             jsonb not null default '{}',
  body              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.content_drafts enable row level security;

-- content_sources: which source_documents informed a draft (provenance)
create table if not exists public.content_sources (
  id          uuid primary key default gen_random_uuid(),
  draft_id    uuid not null references public.content_drafts(id) on delete cascade,
  document_id uuid not null references public.source_documents(id) on delete cascade,
  snippet     text,
  created_at  timestamptz not null default now(),
  unique (draft_id, document_id)
);
alter table public.content_sources enable row level security;
