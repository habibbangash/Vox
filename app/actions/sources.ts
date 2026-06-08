'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { generateWebhookSecret } from '@/lib/sources/krisp'
import { validateFeedUrl } from '@/lib/sources/rss'
import { fetchChannelMessages, fetchUserName, slackTsToDate } from '@/lib/sources/slack'
import { fetchThreads, refreshGoogleToken } from '@/lib/sources/gmail'
import {
  refreshHubSpotToken,
  fetchAllContacts, fetchAllDeals, fetchAllNotes, fetchAllCalls,
  contactToDocument, dealToDocument, noteToDocument, callToDocument,
} from '@/lib/sources/hubspot'
import {
  refreshGranolaToken,
  listMeetingIds, getMeetingsWithSummary, meetingToDocument,
} from '@/lib/sources/granola'
import { fetchNotionPages, pageToDocument } from '@/lib/sources/notion'
import { syncFeedById } from '@/lib/sources/sync-connection'

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

export async function disconnectSource(connectionId: string): Promise<SourceActionState> {
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
    .delete()
    .eq('id', connectionId)
    .eq('workspace_id', member.workspace_id)

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

export async function syncHubSpot(connectionId: string): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: connection } = await adminClient
    .from('source_connections')
    .select('id, workspace_id, user_id')
    .eq('id', connectionId)
    .single()

  if (!connection || connection.user_id !== user.id) return { error: 'Not found' }

  const { data: creds } = await adminClient
    .from('source_credentials')
    .select('access_token, refresh_token, expires_at')
    .eq('connection_id', connectionId)
    .single()

  if (!creds?.access_token) return { error: 'No credentials found' }

  // Refresh token if expired or expiring within 60 s (HubSpot tokens last ~30 min)
  let accessToken = creds.access_token
  if (creds.expires_at && new Date(creds.expires_at) < new Date(Date.now() + 60_000)) {
    const refreshed = await refreshHubSpotToken(creds.refresh_token ?? '')
    if (!refreshed) return { error: 'Could not refresh HubSpot token' }
    accessToken = refreshed.access_token
    await adminClient
      .from('source_credentials')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq('connection_id', connectionId)
  }

  await adminClient
    .from('source_connections')
    .update({ status: 'syncing' })
    .eq('id', connectionId)

  try {
    const [contacts, deals, notes, calls] = await Promise.all([
      fetchAllContacts(accessToken),
      fetchAllDeals(accessToken),
      fetchAllNotes(accessToken),
      fetchAllCalls(accessToken),
    ])

    const docs = [
      ...contacts.map((c) => contactToDocument(c, connection.workspace_id, connectionId)),
      ...deals.map((d) => dealToDocument(d, connection.workspace_id, connectionId)),
      ...notes.map((n) => noteToDocument(n, connection.workspace_id, connectionId)),
      ...calls.map((c) => callToDocument(c, connection.workspace_id, connectionId)),
    ]

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

export async function syncGranola(connectionId: string): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: connection } = await adminClient
    .from('source_connections')
    .select('id, workspace_id, user_id')
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
  if (creds.expires_at && new Date(creds.expires_at).getTime() - Date.now() < 60_000) {
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const refreshed = await refreshGranolaToken(creds.refresh_token ?? '', `${origin}/api/oauth/granola/metadata`)
    if (!refreshed) return { error: 'Could not refresh Granola token' }
    accessToken = refreshed.access_token
    await adminClient
      .from('source_credentials')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? creds.refresh_token,
        ...(refreshed.expires_in ? { expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() } : {}),
      })
      .eq('connection_id', connectionId)
  }

  await adminClient.from('source_connections').update({ status: 'syncing' }).eq('id', connectionId)

  try {
    const meetingMeta = await listMeetingIds(accessToken)
    const ids = meetingMeta.map(m => m.id)
    const meetings = await getMeetingsWithSummary(accessToken, ids)
    const docs = meetings
      .filter(m => m.summary)
      .map(m => meetingToDocument(m, connection.workspace_id, connectionId))

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
      .update({ status: 'active', last_synced_at: new Date().toISOString(), synced_count: count ?? 0, error_message: null })
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

export async function syncNotion(connectionId: string): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: connection } = await adminClient
    .from('source_connections')
    .select('id, workspace_id, user_id')
    .eq('id', connectionId)
    .single()

  if (!connection || connection.user_id !== user.id) return { error: 'Not found' }

  const { data: creds } = await adminClient
    .from('source_credentials')
    .select('access_token')
    .eq('connection_id', connectionId)
    .single()

  if (!creds?.access_token) return { error: 'No credentials found' }

  await adminClient.from('source_connections').update({ status: 'syncing' }).eq('id', connectionId)

  try {
    const pages = await fetchNotionPages(creds.access_token)
    const docs = pages.map((p) => pageToDocument(p, connection.workspace_id, connectionId))

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
      .update({ status: 'active', last_synced_at: new Date().toISOString(), synced_count: count ?? 0, error_message: null })
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

// ─── Manual content import ────────────────────────────────────────────────────

export async function importManualContent(input: {
  title: string
  content: string
  author_name: string | null
}): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return { error: 'No workspace found' }

  // Ensure a manual source_connection exists for this user
  let { data: connection } = await adminClient
    .from('source_connections')
    .select('id')
    .eq('workspace_id', member.workspace_id)
    .eq('user_id', user.id)
    .eq('source_type', 'manual')
    .single()

  if (!connection) {
    const { data: inserted, error: connErr } = await adminClient
      .from('source_connections')
      .insert({
        workspace_id: member.workspace_id,
        user_id: user.id,
        source_type: 'manual',
        display_name: 'Manual imports',
        status: 'active',
      })
      .select('id')
      .single()

    if (connErr || !inserted) return { error: connErr?.message ?? 'Failed to create source' }
    connection = inserted
  }

  const externalId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const { error } = await adminClient
    .from('source_documents')
    .insert({
      workspace_id: member.workspace_id,
      connection_id: connection.id,
      source_type: 'manual',
      external_id: externalId,
      title: input.title,
      content: input.content,
      author_name: input.author_name,
      metadata: {} as Record<string, unknown>,
      processed: false,
      ingested_at: new Date().toISOString(),
    })

  if (error) return { error: error.message }

  // Update synced_count
  const { count } = await adminClient
    .from('source_documents')
    .select('*', { count: 'exact', head: true })
    .eq('connection_id', connection.id)

  await adminClient
    .from('source_connections')
    .update({ last_synced_at: new Date().toISOString(), synced_count: count ?? 0 })
    .eq('id', connection.id)

  revalidatePath('/sources')
  return { success: true }
}
