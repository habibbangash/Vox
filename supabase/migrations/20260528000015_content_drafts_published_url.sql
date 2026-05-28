ALTER TABLE public.content_drafts
  ADD COLUMN IF NOT EXISTS published_url text,
  ADD COLUMN IF NOT EXISTS published_at  timestamptz;
