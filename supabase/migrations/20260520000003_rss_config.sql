-- Add generic config column to store integration-specific settings (RSS URL, Slack channel IDs, etc.)
alter table public.source_connections
  add column config jsonb not null default '{}';

-- Expand source_type to include rss and slack
alter table public.source_connections
  drop constraint source_connections_source_type_check;

alter table public.source_connections
  add constraint source_connections_source_type_check
  check (source_type in ('krisp', 'granola', 'rss', 'slack'));

-- RSS feeds: one workspace can have many feeds (different external URLs), so relax the unique constraint
-- Current unique(workspace_id, user_id, source_type) would block adding a second RSS feed.
-- Replace it with unique(workspace_id, user_id, source_type, config->>'url') via a partial unique index.
alter table public.source_connections
  drop constraint source_connections_workspace_id_user_id_source_type_key;

create unique index source_connections_krisp_granola_unique
  on public.source_connections (workspace_id, user_id, source_type)
  where source_type in ('krisp', 'granola', 'slack');

create unique index source_connections_rss_unique
  on public.source_connections (workspace_id, user_id, (config->>'url'))
  where source_type = 'rss';
