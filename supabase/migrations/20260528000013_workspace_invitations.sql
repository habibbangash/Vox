CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email       text,
  token       uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role        text NOT NULL DEFAULT 'member',
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Only service_role (admin client) accesses this table
CREATE POLICY "service_role_only"
  ON public.workspace_invitations
  USING (false);

GRANT ALL ON public.workspace_invitations TO service_role;
