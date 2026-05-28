-- Enable RLS on source tables that were missing it.
-- All application access goes through adminClient (service_role), so deny-all
-- for anon/authenticated is safe and closes direct-query exposure.

ALTER TABLE public.source_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_documents   ENABLE ROW LEVEL SECURITY;

-- Deny all access for non-service-role callers
CREATE POLICY "service_role_only" ON public.source_connections USING (false);
CREATE POLICY "service_role_only" ON public.source_credentials USING (false);
CREATE POLICY "service_role_only" ON public.source_documents   USING (false);

-- Explicit grants to service_role (defence in depth)
GRANT ALL ON public.source_connections TO service_role;
GRANT ALL ON public.source_credentials TO service_role;
GRANT ALL ON public.source_documents   TO service_role;
