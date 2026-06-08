-- ============================================================
-- Intelligence Layer
-- document_chunks  — properly chunked embeddings (replaces
--                    the 2000-char truncation on source_documents)
-- entities         — canonical entity registry (Observable)
-- entity_mentions  — entity ↔ document edges (Observation)
-- entity_relationships — entity ↔ entity graph edges
-- signals          — pre-computed cross-source intelligence
-- ============================================================

-- Fuzzy string matching for entity deduplication
create extension if not exists pg_trgm schema extensions;

-- ─── document_chunks ──────────────────────────────────────────────────────────
-- One row per chunk. A single source_document splits into N overlapping chunks
-- (~1500 chars each, 200-char overlap). match_documents now searches here.

create table public.document_chunks (
  id           uuid        primary key default gen_random_uuid(),
  document_id  uuid        not null references public.source_documents(id) on delete cascade,
  workspace_id uuid        not null references public.workspaces(id)        on delete cascade,
  chunk_index  int         not null,
  content      text        not null,
  token_count  int,
  embedding    extensions.vector(384),
  created_at   timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create index document_chunks_document_idx  on public.document_chunks(document_id);
create index document_chunks_workspace_idx on public.document_chunks(workspace_id);

-- HNSW index for cosine similarity on chunks
create index document_chunks_embedding_idx
  on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

alter table public.document_chunks enable row level security;

create policy "members can read their chunks"
  on public.document_chunks for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- ─── entities ─────────────────────────────────────────────────────────────────
-- Canonical entity registry. Each unique entity (person, company, topic, etc.)
-- gets one row per workspace. entity_mentions links documents to this table.

create table public.entities (
  id             uuid        primary key default gen_random_uuid(),
  workspace_id   uuid        not null references public.workspaces(id) on delete cascade,
  type           text        not null check (type in (
    'person', 'company', 'topic', 'objection',
    'buying_signal', 'theme', 'product', 'competitor', 'other'
  )),
  name           text        not null,
  canonical_name text        not null,   -- lowercased, normalised for dedup
  metadata       jsonb       not null default '{}',
  created_at     timestamptz not null default now(),
  unique(workspace_id, type, canonical_name)
);

create index entities_workspace_type_idx    on public.entities(workspace_id, type);
-- GIN trigram index for fuzzy deduplication queries
create index entities_canonical_trgm_idx
  on public.entities
  using gin (canonical_name extensions.gin_trgm_ops);

alter table public.entities enable row level security;

create policy "members can read their entities"
  on public.entities for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- ─── entity_mentions ──────────────────────────────────────────────────────────
-- Each row = one entity appearing in one document (the "Observation" edge).
-- Includes the exact quote and surrounding context for grounding content drafts.

create table public.entity_mentions (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references public.workspaces(id)       on delete cascade,
  entity_id    uuid        not null references public.entities(id)         on delete cascade,
  document_id  uuid        not null references public.source_documents(id) on delete cascade,
  snippet      text,        -- exact quote that triggered extraction
  context      text,        -- surrounding sentence/paragraph
  confidence   float       not null default 1.0,
  mentioned_at timestamptz,  -- when the event happened (not ingested_at)
  metadata     jsonb       not null default '{}'
);

create index entity_mentions_entity_idx   on public.entity_mentions(workspace_id, entity_id);
create index entity_mentions_document_idx on public.entity_mentions(workspace_id, document_id);
create index entity_mentions_time_idx
  on public.entity_mentions(workspace_id, mentioned_at desc nulls last);

alter table public.entity_mentions enable row level security;

create policy "members can read their entity mentions"
  on public.entity_mentions for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- ─── entity_relationships ─────────────────────────────────────────────────────
-- Directed graph edges between entities.
-- weight and evidence_count increase each time the relationship is re-observed.

create table public.entity_relationships (
  id             uuid        primary key default gen_random_uuid(),
  workspace_id   uuid        not null references public.workspaces(id) on delete cascade,
  from_entity_id uuid        not null references public.entities(id)   on delete cascade,
  to_entity_id   uuid        not null references public.entities(id)   on delete cascade,
  relationship   text        not null,  -- e.g. 'raised_objection', 'works_at', 'mentioned_with'
  weight         float       not null default 1.0,
  evidence_count int         not null default 1,
  last_seen_at   timestamptz not null default now(),
  unique(workspace_id, from_entity_id, to_entity_id, relationship)
);

create index entity_rel_from_idx on public.entity_relationships(workspace_id, from_entity_id);
create index entity_rel_to_idx   on public.entity_relationships(workspace_id, to_entity_id);

alter table public.entity_relationships enable row level security;

create policy "members can read their entity relationships"
  on public.entity_relationships for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- ─── signals ──────────────────────────────────────────────────────────────────
-- Pre-computed cross-source intelligence. Refreshed by pg_cron (hourly).
-- Powers the Signals tab without running expensive aggregations live.
-- NOTE: enable pg_cron in Supabase dashboard (Database > Extensions) before
-- wiring the scheduled refresh job.

create table public.signals (
  id             uuid        primary key default gen_random_uuid(),
  workspace_id   uuid        not null references public.workspaces(id) on delete cascade,
  signal_type    text        not null,   -- 'recurring_topic', 'objection_trend', 'buying_signal', 'at_risk'
  entity_id      uuid        references public.entities(id) on delete set null,
  title          text        not null,
  description    text,
  document_count int         not null default 0,
  source_count   int         not null default 0,  -- distinct source_types
  time_window    text        not null default '30_days',
  computed_at    timestamptz not null default now(),
  metadata       jsonb       not null default '{}'
);

create index signals_workspace_idx on public.signals(workspace_id, computed_at desc);
create index signals_type_idx      on public.signals(workspace_id, signal_type);

alter table public.signals enable row level security;

create policy "members can read their signals"
  on public.signals for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- ─── match_documents (updated) ────────────────────────────────────────────────
-- Searches document_chunks for new documents (properly chunked).
-- Falls back to source_documents.embedding for legacy docs that pre-date chunking.
-- Returns one result per document (best matching chunk wins).

create or replace function public.match_documents(
  query_embedding extensions.vector(384),
  p_workspace_id  uuid,
  match_count     int   default 10,
  threshold       float default 0.35
)
returns table (
  id            uuid,
  title         text,
  content       text,
  source_type   text,
  author_name   text,
  connection_id uuid,
  metadata      jsonb,
  ingested_at   timestamptz,
  similarity    float
)
language sql stable as $$
  with chunk_results as (
    -- Primary path: properly chunked documents
    select
      dc.document_id                              as doc_id,
      dc.content                                  as match_content,
      1 - (dc.embedding <=> query_embedding)      as similarity
    from public.document_chunks dc
    where
      dc.workspace_id = p_workspace_id
      and dc.embedding is not null
      and 1 - (dc.embedding <=> query_embedding) > threshold
  ),
  legacy_results as (
    -- Fallback: pre-chunking docs that only have source_documents.embedding
    select
      sd.id                                       as doc_id,
      left(sd.content, 1500)                      as match_content,
      1 - (sd.embedding <=> query_embedding)      as similarity
    from public.source_documents sd
    where
      sd.workspace_id = p_workspace_id
      and sd.embedding is not null
      and 1 - (sd.embedding <=> query_embedding) > threshold
      and not exists (
        select 1 from public.document_chunks dc2
        where dc2.document_id = sd.id
        limit 1
      )
  ),
  all_results as (
    select doc_id, match_content, similarity from chunk_results
    union all
    select doc_id, match_content, similarity from legacy_results
  ),
  best_per_doc as (
    select
      doc_id,
      match_content,
      similarity,
      row_number() over (partition by doc_id order by similarity desc) as rn
    from all_results
  )
  select
    sd.id,
    sd.title,
    bpd.match_content   as content,
    sd.source_type,
    sd.author_name,
    sd.connection_id,
    sd.metadata,
    sd.ingested_at,
    bpd.similarity
  from best_per_doc bpd
  join public.source_documents sd on sd.id = bpd.doc_id
  where bpd.rn = 1
  order by bpd.similarity desc
  limit match_count;
$$;

-- ─── extract-entities trigger ─────────────────────────────────────────────────
-- Fires the extract-entities Edge Function whenever a document is marked
-- processed = true (i.e. after embed-document completes successfully).

create or replace function public.trigger_extract_entities()
returns trigger language plpgsql security definer as $$
begin
  if new.processed = true and (old.processed = false or old.processed is null) then
    perform net.http_post(
      url     := 'https://fdjrenzjzfweepoblabx.supabase.co/functions/v1/extract-entities',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := jsonb_build_object('id', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger extract_entities_after_processed
  after update of processed on public.source_documents
  for each row execute function public.trigger_extract_entities();
