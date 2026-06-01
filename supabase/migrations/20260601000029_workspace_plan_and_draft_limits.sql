ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','growth','enterprise'));
CREATE OR REPLACE FUNCTION public.count_drafts_this_month(p_workspace_id uuid)
RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*) FROM public.content_drafts
  WHERE workspace_id=p_workspace_id AND created_at>=date_trunc('month',now());
$$;
GRANT EXECUTE ON FUNCTION public.count_drafts_this_month(uuid) TO service_role;
