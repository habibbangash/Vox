ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.workspaces.settings IS 'Workspace-level config. Keys: anthropic_api_key (store with caution — not encrypted at rest in this column).';
