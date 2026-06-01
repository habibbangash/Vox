-- Enable pgvector for storing embeddings
create extension if not exists vector schema extensions;

-- Enable pg_net for async HTTP calls from triggers
create extension if not exists pg_net schema extensions;

-- Add embedding column to source_documents (gte-small produces 384-dimensional vectors)
alter table public.source_documents
  add column embedding extensions.vector(384);

-- HNSW index for fast cosine similarity search
create index source_documents_embedding_idx
  on public.source_documents
  using hnsw (embedding extensions.vector_cosine_ops);

-- Trigger function: fires async HTTP POST to embed-document Edge Function on every INSERT
create or replace function public.trigger_embed_document()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url  := 'https://fdjrenzjzfweepoblabx.supabase.co/functions/v1/embed-document',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('id', NEW.id)
  );
  return NEW;
end;
$$;

create trigger embed_document_after_insert
  after insert on public.source_documents
  for each row execute function public.trigger_embed_document();
