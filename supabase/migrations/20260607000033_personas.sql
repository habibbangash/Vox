-- Personas: audience segments for persona-aware content generation
CREATE TABLE public.personas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  keywords     TEXT[] NOT NULL DEFAULT '{}',
  color        TEXT NOT NULL DEFAULT '#6366f1',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Junction table: which documents belong to which persona
CREATE TABLE public.document_persona_tags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  document_id  UUID NOT NULL,
  persona_id   UUID NOT NULL,
  auto_tagged  BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (document_id, persona_id)
);

-- Indexes for common query patterns
CREATE INDEX ON public.personas (workspace_id);
CREATE INDEX ON public.document_persona_tags (persona_id);
CREATE INDEX ON public.document_persona_tags (workspace_id, document_id);

-- RLS: deny all — accessed exclusively via service_role adminClient
ALTER TABLE public.personas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_persona_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.personas
  USING (false);

CREATE POLICY service_role_only ON public.document_persona_tags
  USING (false);

-- RPC: keyword-match documents to a persona and insert tags
CREATE OR REPLACE FUNCTION public.auto_tag_documents_for_persona(
  p_persona_id UUID,
  p_keywords   TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  kw       text;
  matched  int := 0;
  doc_row  RECORD;
BEGIN
  FOREACH kw IN ARRAY p_keywords LOOP
    FOR doc_row IN
      SELECT id, workspace_id
      FROM public.source_documents
      WHERE workspace_id = (SELECT workspace_id FROM public.personas WHERE id = p_persona_id)
        AND (
          metadata->>'jobtitle'     ILIKE '%' || kw || '%' OR
          metadata->>'job_title'    ILIKE '%' || kw || '%' OR
          metadata->>'contact_role' ILIKE '%' || kw || '%' OR
          metadata->>'industry'     ILIKE '%' || kw || '%' OR
          metadata->>'role'         ILIKE '%' || kw || '%' OR
          metadata->>'attendees'    ILIKE '%' || kw || '%' OR
          title                     ILIKE '%' || kw || '%'
        )
    LOOP
      INSERT INTO public.document_persona_tags
        (workspace_id, document_id, persona_id, auto_tagged)
      VALUES
        (doc_row.workspace_id, doc_row.id, p_persona_id, true)
      ON CONFLICT (document_id, persona_id) DO NOTHING;
      matched := matched + 1;
    END LOOP;
  END LOOP;

  RETURN matched;
END;
$$;
