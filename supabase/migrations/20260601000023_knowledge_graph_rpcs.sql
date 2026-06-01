-- ============================================================
-- Knowledge Graph RPCs
-- upsert_entity_relationship — called by extract-entities Edge Function
-- get_workspace_graph        — powers the visual graph in Intelligence tab
-- ============================================================

-- ─── upsert_entity_relationship ───────────────────────────────────────────────
-- Inserts a new edge or increments evidence_count on conflict.
-- Used by the extract-entities Edge Function after each document ingest.

create or replace function public.upsert_entity_relationship(
  p_workspace_id   uuid,
  p_from_entity_id uuid,
  p_to_entity_id   uuid,
  p_relationship   text
) returns void language plpgsql security definer as $$
begin
  insert into public.entity_relationships
    (workspace_id, from_entity_id, to_entity_id, relationship, weight, evidence_count, last_seen_at)
  values
    (p_workspace_id, p_from_entity_id, p_to_entity_id, p_relationship, 1.0, 1, now())
  on conflict (workspace_id, from_entity_id, to_entity_id, relationship)
  do update set
    evidence_count = entity_relationships.evidence_count + 1,
    weight         = entity_relationships.weight + 0.5,
    last_seen_at   = now();
end;
$$;

-- ─── get_workspace_graph ──────────────────────────────────────────────────────
-- Returns top p_limit entities (by mention count) as nodes, and all edges
-- between those nodes. Capped to keep the WebGL canvas responsive.

create or replace function public.get_workspace_graph(
  p_workspace_id uuid,
  p_limit        int default 300
) returns json language plpgsql security definer as $$
declare
  v_nodes json;
  v_edges json;
begin
  -- Top N entities ordered by mention frequency
  select json_agg(row_to_json(n)) into v_nodes
  from (
    select
      e.id,
      e.type,
      e.name,
      e.canonical_name,
      count(em.id) as mention_count
    from public.entities e
    left join public.entity_mentions em on em.entity_id = e.id
    where e.workspace_id = p_workspace_id
    group by e.id, e.type, e.name, e.canonical_name
    order by count(em.id) desc
    limit p_limit
  ) n;

  -- All edges whose both endpoints are in the top-N set
  select json_agg(row_to_json(r)) into v_edges
  from (
    select
      er.id,
      er.from_entity_id as source,
      er.to_entity_id   as target,
      er.relationship,
      er.weight,
      er.evidence_count
    from public.entity_relationships er
    where er.workspace_id = p_workspace_id
      and er.from_entity_id in (
        select e2.id
        from public.entities e2
        left join public.entity_mentions em2 on em2.entity_id = e2.id
        where e2.workspace_id = p_workspace_id
        group by e2.id
        order by count(em2.id) desc
        limit p_limit
      )
      and er.to_entity_id in (
        select e3.id
        from public.entities e3
        left join public.entity_mentions em3 on em3.entity_id = e3.id
        where e3.workspace_id = p_workspace_id
        group by e3.id
        order by count(em3.id) desc
        limit p_limit
      )
  ) r;

  return json_build_object(
    'nodes', coalesce(v_nodes, '[]'::json),
    'edges', coalesce(v_edges, '[]'::json)
  );
end;
$$;
