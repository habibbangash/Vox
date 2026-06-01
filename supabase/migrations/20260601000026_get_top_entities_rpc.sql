CREATE OR REPLACE FUNCTION public.get_top_entities(p_workspace_id uuid, p_limit int DEFAULT 30)
RETURNS TABLE (id uuid, type text, canonical_name text, mention_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.type, e.canonical_name, COUNT(em.id) AS mention_count
  FROM public.entity_mentions em JOIN public.entities e ON e.id = em.entity_id
  WHERE em.workspace_id = p_workspace_id
  GROUP BY e.id, e.type, e.canonical_name ORDER BY mention_count DESC LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_top_entities(uuid, int) TO service_role;
