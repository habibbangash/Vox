-- Add content_hash column for soft deduplication at ingestion time
ALTER TABLE public.source_documents
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Backfill existing rows
UPDATE public.source_documents
SET content_hash = md5(content)
WHERE content_hash IS NULL AND content IS NOT NULL;

-- Index for fast lookup (not unique — duplicates exist in current data)
CREATE INDEX IF NOT EXISTS idx_source_documents_content_hash
  ON public.source_documents (workspace_id, source_type, content_hash)
  WHERE content_hash IS NOT NULL;
