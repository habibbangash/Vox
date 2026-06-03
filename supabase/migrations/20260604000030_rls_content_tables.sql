-- Explicit deny-all RLS policies for content tables.
-- These tables had RLS enabled but no policies (implicit deny).
-- Making it explicit matches the pattern used on source_connections,
-- source_credentials, source_documents, and workspace_invitations.
-- All access goes through adminClient (service role) which bypasses RLS.

CREATE POLICY "service_role_only" ON public.author_profiles USING (false);
CREATE POLICY "service_role_only" ON public.content_drafts  USING (false);
CREATE POLICY "service_role_only" ON public.content_sources USING (false);
