'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { generateWebhookSecret } from '@/lib/sources/krisp'
import { fetchFeed, validateFeedUrl } from '@/lib/sources/rss'
import { fetchChannelMessages, fetchUserName, slackTsToDate } from '@/lib/sources/slack'
import { fetchThreads, refreshGoogleToken } from '@/lib/sources/gmail'

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

export async function saveSlackChannels(
  connectionId: string,
  channelIds: string[]
): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: connection } = await adminClient
    .from('source_connections')
    .select('id, user_id, config')
    .eq('id', connectionId)
    .single()

  if (!connection || connection.user_id !== user.id) return { error: 'Not found' }

  const config = { ...(connection.config as Record<string, unknown>), selected_channel_ids: channelIds }

  const { error } = await adminClient
    .from('source_connections')
    .update({ config })
    .eq('id', connectionId)

  if (error) return { error: error.message }

  revalidatePath('/sources')
  return { success: true }
}

export async function syncSlack(connectionId: string): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: connection } = await adminClient
    .from('source_connections')
    .select('id, workspace_id, user_id, config, last_synced_at')
    .eq('id', connectionId)
    .single()

  if (!connection || connection.user_id !== user.id) return { error: 'Not found' }

  const { data: creds } = await adminClient
    .from('source_credentials')
    .select('access_token')
    .eq('connection_id', connectionId)
    .single()

  if (!creds?.access_token) return { error: 'No credentials found' }

  const config = connection.config as {
    selected_channel_ids?: string[]
    available_channels?: { id: string; name: string }[]
  }

  const selectedIds = config.selected_channel_ids ?? []
  if (selectedIds.length === 0) return { error: 'No channels selected' }

  await adminClient
    .from('source_connections')
    .update({ status: 'syncing' })
    .eq('id', connectionId)

  try {
    const oldest = connection.last_synced_at
      ? String(new Date(connection.last_synced_at).getTime() / 1000)
      : String(Date.now() / 1000 - 30 * 24 * 60 * 60)

    const channelMap = Object.fromEntries(
      (config.available_channels ?? []).map((ch) => [ch.id, ch.name])
    )

    const userCache: Record<string, string> = {}

    for (const channelId of selectedIds) {
      const messages = await fetchChannelMessages(creds.access_token, channelId, oldest)
      const channelName = channelMap[channelId] ?? channelId

      const docs = await Promise.all(
        messages.map(async (msg) => {
          if (!userCache[msg.user]) {
            const name = await fetchUserName(creds.access_token, msg.user)
            userCache[msg.user] = name ?? msg.user
          }
          const date = slackTsToDate(msg.ts).split('T')[0]
          return {
            workspace_id: connection.workspace_id,
            connection_id: connectionId,
            source_type: 'slack',
            external_id: msg.ts,
            title: `#${channelName} — ${date}`,
            content: msg.text,
            author_name: userCache[msg.user],
            metadata: { channel_id: channelId, channel_name: channelName, ts: msg.ts } as Record<string, unknown>,
            processed: false,
            ingested_at: new Date().toISOString(),
          }
        })
      )

      if (docs.length > 0) {
        await adminClient
          .from('source_documents')
          .upsert(docs, { onConflict: 'workspace_id,source_type,external_id' })
      }
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

    revalidatePath('/sources')
    return { success: true, synced: count ?? 0 }
  } catch (err) {
    await adminClient
      .from('source_connections')
      .update({ status: 'error', error_message: err instanceof Error ? err.message : 'Sync failed' })
      .eq('id', connectionId)
    return { error: err instanceof Error ? err.message : 'Sync failed' }
  }
}

export async function syncGmail(connectionId: string): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: connection } = await adminClient
    .from('source_connections')
    .select('id, workspace_id, user_id, config')
    .eq('id', connectionId)
    .single()

  if (!connection || connection.user_id !== user.id) return { error: 'Not found' }

  const { data: creds } = await adminClient
    .from('source_credentials')
    .select('access_token, refresh_token, expires_at')
    .eq('connection_id', connectionId)
    .single()

  if (!creds?.access_token) return { error: 'No credentials found' }

  let accessToken = creds.access_token

  if (creds.expires_at) {
    const expiresAt = new Date(creds.expires_at).getTime()
    if (expiresAt - Date.now() < 60_000) {
      const newToken = await refreshGoogleToken(creds.refresh_token ?? '')
      if (newToken) {
        accessToken = newToken
        await adminClient
          .from('source_credentials')
          .update({
            access_token: newToken,
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          })
          .eq('connection_id', connectionId)
      }
    }
  }

  await adminClient
    .from('source_connections')
    .update({ status: 'syncing' })
    .eq('id', connectionId)

  try {
    const config = connection.config as { query?: string }
    const query = config.query ?? 'newer_than:90d'

    const threads = await fetchThreads(accessToken, query)

    const docs = threads.map((thread) => ({
      workspace_id: connection.workspace_id,
      connection_id: connectionId,
      source_type: 'gmail',
      external_id: thread.id,
      title: thread.subject,
      content: thread.body,
      author_name: thread.from,
      metadata: { gmail_thread_id: thread.id } as Record<string, unknown>,
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

    revalidatePath('/sources')
    return { success: true, synced: count ?? 0 }
  } catch (err) {
    await adminClient
      .from('source_connections')
      .update({ status: 'error', error_message: err instanceof Error ? err.message : 'Sync failed' })
      .eq('id', connectionId)
    return { error: err instanceof Error ? err.message : 'Sync failed' }
  }
}

export async function updateGmailQuery(
  connectionId: string,
  query: string
): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: connection } = await adminClient
    .from('source_connections')
    .select('id, user_id, config')
    .eq('id', connectionId)
    .single()

  if (!connection || connection.user_id !== user.id) return { error: 'Not found' }

  const config = { ...(connection.config as Record<string, unknown>), query }

  const { error } = await adminClient
    .from('source_connections')
    .update({ config })
    .eq('id', connectionId)

  if (error) return { error: error.message }

  revalidatePath('/sources')
  return { success: true }
}
