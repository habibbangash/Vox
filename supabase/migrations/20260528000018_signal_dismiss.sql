alter table public.signals
  add column if not exists dismissed_at timestamptz default null;

create index if not exists signals_active_idx
  on public.signals(workspace_id, computed_at desc)
  where dismissed_at is null;
