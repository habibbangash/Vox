ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE INDEX IF NOT EXISTS signals_pinned_at_idx
  ON public.signals (workspace_id, pinned_at)
  WHERE pinned_at IS NOT NULL;
