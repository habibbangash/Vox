CREATE OR REPLACE FUNCTION public.backfill_entity_extraction()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE doc RECORD; remaining INT;
BEGIN
  SELECT COUNT(*) INTO remaining FROM source_documents
  WHERE processed=true AND source_type!='rss'
    AND id NOT IN(SELECT document_id FROM entity_mentions WHERE document_id IS NOT NULL);
  IF remaining=0 THEN PERFORM cron.unschedule('backfill-entity-extraction'); RETURN; END IF;
  FOR doc IN
    SELECT id FROM source_documents WHERE processed=true AND source_type!='rss'
      AND id NOT IN(SELECT document_id FROM entity_mentions WHERE document_id IS NOT NULL)
    ORDER BY CASE source_type WHEN'krisp'THEN 1 WHEN'slack'THEN 2 WHEN'granola'THEN 3
      WHEN'hubspot'THEN 4 WHEN'manual'THEN 5 WHEN'gmail'THEN 6 WHEN'notion'THEN 7
      WHEN'linkedin'THEN 8 ELSE 9 END, ingested_at DESC LIMIT 1
  LOOP
    PERFORM net.http_post(
      url:='https://fdjrenzjzfweepoblabx.supabase.co/functions/v1/extract-entities',
      headers:='{"Content-Type":"application/json"}'::jsonb,
      body:=jsonb_build_object('id',doc.id));
  END LOOP;
END;$$;
