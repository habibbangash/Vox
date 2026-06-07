-- Backfill function: fires embed-document for unprocessed docs, 10 at a time
CREATE OR REPLACE FUNCTION public.backfill_embed_document()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  doc RECORD;
BEGIN
  FOR doc IN
    SELECT id FROM source_documents
    WHERE (processed = false OR processed IS NULL)
      AND content IS NOT NULL
      AND LENGTH(content) >= 10
    ORDER BY ingested_at ASC
    LIMIT 10
  LOOP
    PERFORM net.http_post(
      url     := 'https://fdjrenzjzfweepoblabx.supabase.co/functions/v1/embed-document',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := jsonb_build_object('id', doc.id)
    );
  END LOOP;
END;
$$;

-- Schedule: every minute, process 10 docs (~18 hours to clear 11k backlog)
SELECT cron.schedule(
  'backfill-embed-document',
  '* * * * *',
  'SELECT public.backfill_embed_document()'
);
