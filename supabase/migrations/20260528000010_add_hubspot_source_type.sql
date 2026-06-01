ALTER TABLE public.source_connections
  DROP CONSTRAINT IF EXISTS source_connections_source_type_check;

ALTER TABLE public.source_connections
  ADD CONSTRAINT source_connections_source_type_check
  CHECK (source_type = ANY (ARRAY['krisp','granola','rss','slack','gmail','hubspot']));
