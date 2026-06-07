-- Trigger: auto-tag documents against all workspace personas when they become processed.
-- Fires on UPDATE when processed transitions false → true (i.e. after embed-document runs).

CREATE OR REPLACE FUNCTION public.tag_document_for_all_personas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  persona_row RECORD;
  kw          TEXT;
  matched     BOOLEAN;
BEGIN
  -- Only run when processed transitions to true
  IF NOT (NEW.processed IS TRUE AND (OLD.processed IS DISTINCT FROM NEW.processed)) THEN
    RETURN NEW;
  END IF;

  FOR persona_row IN
    SELECT id, keywords
    FROM public.personas
    WHERE workspace_id = NEW.workspace_id
      AND cardinality(keywords) > 0
  LOOP
    matched := FALSE;
    FOREACH kw IN ARRAY persona_row.keywords LOOP
      IF NOT matched AND (
        NEW.metadata->>'jobtitle'     ILIKE '%' || kw || '%' OR
        NEW.metadata->>'job_title'    ILIKE '%' || kw || '%' OR
        NEW.metadata->>'contact_role' ILIKE '%' || kw || '%' OR
        NEW.metadata->>'industry'     ILIKE '%' || kw || '%' OR
        NEW.metadata->>'role'         ILIKE '%' || kw || '%' OR
        NEW.metadata->>'attendees'    ILIKE '%' || kw || '%' OR
        NEW.title                     ILIKE '%' || kw || '%'
      ) THEN
        matched := TRUE;
      END IF;
    END LOOP;

    IF matched THEN
      INSERT INTO public.document_persona_tags (workspace_id, document_id, persona_id, auto_tagged)
      VALUES (NEW.workspace_id, NEW.id, persona_row.id, true)
      ON CONFLICT (document_id, persona_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tag_document_for_personas_on_process
  AFTER UPDATE ON public.source_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.tag_document_for_all_personas();
