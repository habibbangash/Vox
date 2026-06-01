ALTER TABLE public.source_connections
  DROP CONSTRAINT IF EXISTS source_connections_source_type_check;

ALTER TABLE public.source_connections
  ADD CONSTRAINT source_connections_source_type_check
  CHECK (source_type IN ('krisp', 'rss', 'slack', 'gmail', 'hubspot', 'linkedin', 'manual'));

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'source_documents'
    AND constraint_name = 'source_documents_source_type_check'
  ) THEN
    ALTER TABLE public.source_documents
      DROP CONSTRAINT source_documents_source_type_check;
  END IF;
END $$;

ALTER TABLE public.source_documents
  ADD CONSTRAINT source_documents_source_type_check
  CHECK (source_type IN ('krisp', 'rss', 'slack', 'gmail', 'hubspot', 'linkedin', 'manual'));
