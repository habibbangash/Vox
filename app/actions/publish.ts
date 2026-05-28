'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { publishLinkedInPost } from '@/lib/sources/linkedin'

async function requireWorkspace(): Promise<
  { workspaceId: string; userId: string } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'No workspace found' }
  return { workspaceId: member.workspace_id, userId: user.id }
}

export async function getLinkedInConnection(): Promise<{
  connected: boolean
  displayName?: string
  connectionId?: string
}> {
  const result = await requireWorkspace()
  if ('error' in result) return { connected: false }

  const { data } = await adminClient
    .from('source_connections')
    .select('id, display_name, status')
    .eq('workspace_id', result.workspaceId)
    .eq('user_id', result.userId)
    .eq('source_type', 'linkedin')
    .eq('status', 'active')
    .single()

  if (!data) return { connected: false }
  return { connected: true, displayName: data.display_name ?? undefined, connectionId: data.id }
}

export async function publishDraftToLinkedIn(
  draftId: string
): Promise<{ error?: string; postId?: string; postUrl?: string }> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  // Load draft
  const { data: draft } = await adminClient
    .from('content_drafts')
    .select('id, body, status, format, workspace_id')
    .eq('id', draftId)
    .eq('workspace_id', result.workspaceId)
    .single()

  if (!draft) return { error: 'Draft not found' }
  if (!draft.body?.trim()) return { error: 'Draft has no content to publish' }
  if (draft.format !== 'linkedin_post') return { error: 'Only LinkedIn post drafts can be published to LinkedIn' }

  // Load LinkedIn connection
  const { data: connection } = await adminClient
    .from('source_connections')
    .select('id, config')
    .eq('workspace_id', result.workspaceId)
    .eq('user_id', result.userId)
    .eq('source_type', 'linkedin')
    .eq('status', 'active')
    .single()

  if (!connection) {
    return { error: 'LinkedIn not connected — connect it in Sources first' }
  }

  const personId = (connection.config as { person_id?: string })?.person_id
  if (!personId) return { error: 'LinkedIn person ID missing — reconnect your LinkedIn account' }

  // Load credentials
  const { data: creds } = await adminClient
    .from('source_credentials')
    .select('access_token, expires_at')
    .eq('connection_id', connection.id)
    .single()

  if (!creds?.access_token) return { error: 'No LinkedIn token found — reconnect your account' }

  if (creds.expires_at && new Date(creds.expires_at) < new Date()) {
    return { error: 'LinkedIn token expired — reconnect your LinkedIn account in Sources' }
  }

  const publishResult = await publishLinkedInPost(creds.access_token, personId, draft.body)

  if (publishResult.error) return { error: publishResult.error }

  // Build the public post URL from the URN returned by LinkedIn
  // x-restli-id format: urn:li:ugcPost:1234567890
  const postUrl = publishResult.postId
    ? `https://www.linkedin.com/feed/update/${encodeURIComponent(publishResult.postId)}/`
    : null

  await adminClient
    .from('content_drafts')
    .update({
      status: 'published',
      published_url: postUrl,
      published_at: new Date().toISOString(),
    })
    .eq('id', draftId)

  revalidatePath('/content')
  return { postId: publishResult.postId, postUrl: postUrl ?? undefined }
}
