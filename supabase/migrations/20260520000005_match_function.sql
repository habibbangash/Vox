-- Semantic similarity search across source_documents for a given workspace.
-- Returns documents ordered by cosine distance, above a similarity threshold.
create or replace function public.match_documents(
  query_embedding extensions.vector(384),
  p_workspace_id  uuid,
  match_count     int     default 10,
  threshold       float   default 0.35
)
returns table (
  id           uuid,
  title        text,
  content      text,
  source_type  text,
  author_name  text,
  connection_id uuid,
  metadata     jsonb,
  ingested_at  timestamptz,
  similarity   float
)
language sql stable
as $$
  select
    sd.id,
    sd.title,
    sd.content,
    sd.source_type,
    sd.author_name,
    sd.connection_id,
    sd.metadata,
    sd.ingested_at,
    1 - (sd.embedding <=> query_embedding) as similarity
  from public.source_documents sd
  where
    sd.workspace_id = p_workspace_id
    and sd.embedding is not null
    and 1 - (sd.embedding <=> query_embedding) > threshold
  order by sd.embedding <=> query_embedding
  limit match_count;
$$;
