'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { generateWebhookSecret } from '@/lib/sources/krisp'
import { fetchFeed, validateFeedUrl } from '@/lib/sources/rss'

export type SourceActionState = { error?: string; success?: boolean; synced?: number } | undefined

export async function connectKrisp(state: SourceActionState): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'No workspace found' }

  const { error } = await adminClient
    .from('source_connections')
    .insert({
      workspace_id: member.workspace_id,
      user_id: user.id,
      source_type: 'krisp',
      display_name: user.email ?? 'Krisp',
      status: 'active',
      webhook_secret: generateWebhookSecret(),
    })

  if (error) return { error: error.message }

  revalidatePath('/sources')
  return { success: true }
}

export async function connectRSS(state: SourceActionState, formData: FormData): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const url = (formData.get('url') as string)?.trim()
  if (!url) return { error: 'URL is required' }

  const { valid, title, error: fetchError } = await validateFeedUrl(url)
  if (!valid) return { error: `Could not read feed: ${fetchError}` }

  const { data: member } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'No workspace found' }

  const { data: connection, error: insertError } = await adminClient
    .from('source_connections')
    .insert({
      workspace_id: member.workspace_id,
      user_id: user.id,
      source_type: 'rss',
      display_name: title ?? url,
      status: 'active',
      config: { url },
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') return { error: 'This feed is already connected' }
    return { error: insertError.message }
  }

  // Initial sync
  const synced = await syncFeedById(connection.id, member.workspace_id, url)
  revalidatePath('/sources')
  return { success: true, synced }
}

export async function syncRSSFeed(connectionId: string): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: connection } = await adminClient
    .from('source_connections')
    .select('id, workspace_id, config, user_id')
    .eq('id', connectionId)
    .single()

  if (!connection || connection.user_id !== user.id) return { error: 'Not found' }

  const url = (connection.config as { url?: string })?.url
  if (!url) return { error: 'No feed URL on this connection' }

  const synced = await syncFeedById(connection.id, connection.workspace_id, url)
  revalidatePath('/sources')
  return { success: true, synced }
}

async function syncFeedById(connectionId: string, workspaceId: string, url: string): Promise<number> {
  await adminClient
    .from('source_connections')
    .update({ status: 'syncing' })
    .eq('id', connectionId)

  try {
    const feed = await fetchFeed(url)

    const docs = feed.items.map((item) => ({
      workspace_id: workspaceId,
      connection_id: connectionId,
      source_type: 'rss',
      external_id: item.external_id,
      title: item.title,
      content: item.content,
      author_name: item.author_name,
      metadata: { url: item.url, published_at: item.published_at } as Record<string, unknown>,
      processed: false,
      ingested_at: new Date().toISOString(),
    }))

    if (docs.length > 0) {
      await adminClient
        .from('source_documents')
        .upsert(docs, { onConflict: 'workspace_id,source_type,external_id' })
    }

    const { count } = await adminClient
      .from('source_documents')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', connectionId)

    await adminClient
      .from('source_connections')
      .update({
        status: 'active',
        last_synced_at: new Date().toISOString(),
        synced_count: count ?? 0,
        error_message: null,
      })
      .eq('id', connectionId)

    return count ?? 0
  } catch (err) {
    await adminClient
      .from('source_connections')
      .update({ status: 'error', error_message: err instanceof Error ? err.message : 'Sync failed' })
      .eq('id', connectionId)
    return 0
  }
}

export async function disconnectSource(connectionId: string): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await adminClient
    .from('source_connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/sources')
  return { success: true }
}
