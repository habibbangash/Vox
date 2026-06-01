alter table public.source_connections drop constraint source_connections_source_type_check;
alter table public.source_connections add constraint source_connections_source_type_check
  check (source_type in ('krisp', 'granola', 'rss', 'slack', 'gmail'));

create unique index source_connections_gmail_unique
  on public.source_connections (workspace_id, user_id, source_type)
  where source_type = 'gmail';
