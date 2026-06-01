-- compute_signals()
-- Aggregates entity_mentions into pre-computed signals rows.
-- Run manually or schedule hourly with pg_cron:
--   SELECT cron.schedule('compute-signals', '0 * * * *', $$SELECT public.compute_signals()$$);
--
-- Requires pg_cron extension (Supabase: Database → Extensions → pg_cron).

create or replace function public.compute_signals()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ws record;
begin
  for ws in select id from public.workspaces loop

    -- clear stale signals so we always start fresh
    delete from public.signals where workspace_id = ws.id;

    -- recurring topics: topic/theme/product entities in 3+ distinct documents
    insert into public.signals
      (workspace_id, signal_type, entity_id, title, description, document_count, source_count, time_window)
    select
      ws.id,
      'recurring_topic',
      e.id,
      e.canonical_name,
      'Mentioned across ' || count(distinct em.document_id)::text || ' documents in the last 30 days.',
      count(distinct em.document_id)::int,
      count(distinct sd.source_type)::int,
      '30_days'
    from public.entity_mentions em
    join public.entities        e  on e.id  = em.entity_id
    join public.source_documents sd on sd.id = em.document_id
    where em.workspace_id   = ws.id
      and em.mentioned_at   > now() - interval '30 days'
      and e.type            in ('topic', 'theme', 'product')
    group by e.id, e.canonical_name
    having count(distinct em.document_id) >= 3
    order by count(distinct em.document_id) desc
    limit 20;

    -- objection trends: objection entities in 2+ documents
    insert into public.signals
      (workspace_id, signal_type, entity_id, title, description, document_count, source_count, time_window)
    select
      ws.id,
      'objection_trend',
      e.id,
      e.canonical_name,
      'Recurring objection spotted in ' || count(distinct em.document_id)::text || ' sources.',
      count(distinct em.document_id)::int,
      count(distinct sd.source_type)::int,
      '30_days'
    from public.entity_mentions em
    join public.entities        e  on e.id  = em.entity_id
    join public.source_documents sd on sd.id = em.document_id
    where em.workspace_id   = ws.id
      and em.mentioned_at   > now() - interval '30 days'
      and e.type            = 'objection'
    group by e.id, e.canonical_name
    having count(distinct em.document_id) >= 2
    order by count(distinct em.document_id) desc
    limit 10;

    -- buying signals: buying_signal entities in 1+ document
    insert into public.signals
      (workspace_id, signal_type, entity_id, title, description, document_count, source_count, time_window)
    select
      ws.id,
      'buying_signal',
      e.id,
      e.canonical_name,
      'Buying intent detected across ' || count(distinct em.document_id)::text || ' documents.',
      count(distinct em.document_id)::int,
      count(distinct sd.source_type)::int,
      '30_days'
    from public.entity_mentions em
    join public.entities        e  on e.id  = em.entity_id
    join public.source_documents sd on sd.id = em.document_id
    where em.workspace_id   = ws.id
      and em.mentioned_at   > now() - interval '30 days'
      and e.type            = 'buying_signal'
    group by e.id, e.canonical_name
    having count(distinct em.document_id) >= 1
    order by count(distinct em.document_id) desc
    limit 10;

    -- competitor mentions: competitor entities in 2+ documents
    insert into public.signals
      (workspace_id, signal_type, entity_id, title, description, document_count, source_count, time_window)
    select
      ws.id,
      'competitor_mention',
      e.id,
      e.canonical_name,
      'Competitor appearing in ' || count(distinct em.document_id)::text || ' sources — worth a battle card.',
      count(distinct em.document_id)::int,
      count(distinct sd.source_type)::int,
      '30_days'
    from public.entity_mentions em
    join public.entities        e  on e.id  = em.entity_id
    join public.source_documents sd on sd.id = em.document_id
    where em.workspace_id   = ws.id
      and em.mentioned_at   > now() - interval '30 days'
      and e.type            = 'competitor'
    group by e.id, e.canonical_name
    having count(distinct em.document_id) >= 2
    order by count(distinct em.document_id) desc
    limit 10;

  end loop;
end;
$$;

-- Grant execute to service role (used by Edge Functions and server actions)
grant execute on function public.compute_signals() to service_role;
