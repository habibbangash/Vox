// Plain module — NOT a server action file. Import from here for cron/internal use.
// Exporting from a 'use server' file would expose syncConnectionInternal as a
// callable server-action endpoint with no auth, allowing any authenticated user
// to trigger syncs for arbitrary workspaces.

import { adminClient } from '@/lib/supabase/admin'
import { fetchFeed } from '@/lib/sources/rss'
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

export async function syncFeedById(connectionId: string, workspaceId: string, url: string): Promise<number> {
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

export async function syncConnectionInternal(connectionId: string): Promise<{ synced?: number; error?: string }> {
  const { data: connection } = await adminClient
    .from('source_connections')
    .select('id, workspace_id, source_type, config, last_synced_at')
    .eq('id', connectionId)
    .single()

  if (!connection) return { error: 'Connection not found' }

  const { source_type } = connection

  if (source_type === 'rss') {
    const url = (connection.config as { url?: string })?.url
    if (!url) return { error: 'No feed URL' }
    const synced = await syncFeedById(connectionId, connection.workspace_id, url)
    return { synced }
  }

  if (source_type === 'slack') {
    const { data: creds } = await adminClient
      .from('source_credentials')
      .select('access_token')
      .eq('connection_id', connectionId)
      .single()
    if (!creds?.access_token) return { error: 'No Slack token' }
    const config = connection.config as { selected_channel_ids?: string[]; available_channels?: { id: string; name: string }[] }
    const selectedIds = config.selected_channel_ids ?? []
    if (selectedIds.length === 0) return { error: 'No channels selected' }
    await adminClient.from('source_connections').update({ status: 'syncing' }).eq('id', connectionId)
    try {
      const oldest = connection.last_synced_at
        ? String(new Date(connection.last_synced_at).getTime() / 1000)
        : String(Date.now() / 1000 - 30 * 24 * 60 * 60)
      const channelMap = Object.fromEntries((config.available_channels ?? []).map((ch: { id: string; name: string }) => [ch.id, ch.name]))
      const userCache: Record<string, string> = {}
      for (const channelId of selectedIds) {
        const messages = await fetchChannelMessages(creds.access_token, channelId, oldest)
        const channelName = channelMap[channelId] ?? channelId
        const docs = await Promise.all(messages.map(async (msg: { user: string; text: string; ts: string }) => {
          if (!userCache[msg.user]) userCache[msg.user] = (await fetchUserName(creds.access_token, msg.user)) ?? msg.user
          return {
            workspace_id: connection.workspace_id, connection_id: connectionId,
            source_type: 'slack', external_id: msg.ts,
            title: `#${channelName} — ${slackTsToDate(msg.ts).split('T')[0]}`,
            content: msg.text, author_name: userCache[msg.user],
            metadata: { channel_id: channelId, channel_name: channelName, ts: msg.ts } as Record<string, unknown>,
            processed: false, ingested_at: new Date().toISOString(),
          }
        }))
        if (docs.length > 0) await adminClient.from('source_documents').upsert(docs, { onConflict: 'workspace_id,source_type,external_id' })
      }
      const { count } = await adminClient.from('source_documents').select('*', { count: 'exact', head: true }).eq('connection_id', connectionId)
      await adminClient.from('source_connections').update({ status: 'active', last_synced_at: new Date().toISOString(), synced_count: count ?? 0, error_message: null }).eq('id', connectionId)
      return { synced: count ?? 0 }
    } catch (err) {
      await adminClient.from('source_connections').update({ status: 'error', error_message: err instanceof Error ? err.message : 'Sync failed' }).eq('id', connectionId)
      return { error: err instanceof Error ? err.message : 'Sync failed' }
    }
  }

  if (source_type === 'gmail') {
    const { data: creds } = await adminClient
      .from('source_credentials')
      .select('access_token, refresh_token, expires_at')
      .eq('connection_id', connectionId)
      .single()
    if (!creds?.access_token) return { error: 'No Gmail token' }
    let accessToken = creds.access_token
    if (creds.expires_at && new Date(creds.expires_at).getTime() - Date.now() < 60_000) {
      const newToken = await refreshGoogleToken(creds.refresh_token ?? '')
      if (newToken) {
        accessToken = newToken
        await adminClient.from('source_credentials').update({ access_token: newToken, expires_at: new Date(Date.now() + 3600 * 1000).toISOString() }).eq('connection_id', connectionId)
      }
    }
    await adminClient.from('source_connections').update({ status: 'syncing' }).eq('id', connectionId)
    try {
      const config = connection.config as { query?: string }
      const threads = await fetchThreads(accessToken, config.query ?? 'newer_than:90d')
      const docs = threads.map((thread: { id: string; subject: string; body: string; from: string }) => ({
        workspace_id: connection.workspace_id, connection_id: connectionId,
        source_type: 'gmail', external_id: thread.id,
        title: thread.subject, content: thread.body, author_name: thread.from,
        metadata: { gmail_thread_id: thread.id } as Record<string, unknown>,
        processed: false, ingested_at: new Date().toISOString(),
      }))
      if (docs.length > 0) await adminClient.from('source_documents').upsert(docs, { onConflict: 'workspace_id,source_type,external_id' })
      const { count } = await adminClient.from('source_documents').select('*', { count: 'exact', head: true }).eq('connection_id', connectionId)
      await adminClient.from('source_connections').update({ status: 'active', last_synced_at: new Date().toISOString(), synced_count: count ?? 0, error_message: null }).eq('id', connectionId)
      return { synced: count ?? 0 }
    } catch (err) {
      await adminClient.from('source_connections').update({ status: 'error', error_message: err instanceof Error ? err.message : 'Sync failed' }).eq('id', connectionId)
      return { error: err instanceof Error ? err.message : 'Sync failed' }
    }
  }

  if (source_type === 'hubspot') {
    const { data: creds } = await adminClient
      .from('source_credentials')
      .select('access_token, refresh_token, expires_at')
      .eq('connection_id', connectionId)
      .single()
    if (!creds?.access_token) return { error: 'No HubSpot token' }
    let accessToken = creds.access_token
    if (creds.expires_at && new Date(creds.expires_at) < new Date(Date.now() + 60_000)) {
      const refreshed = await refreshHubSpotToken(creds.refresh_token ?? '')
      if (!refreshed) return { error: 'Could not refresh HubSpot token' }
      accessToken = refreshed.access_token
      await adminClient.from('source_credentials').update({ access_token: refreshed.access_token, refresh_token: refreshed.refresh_token, expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() }).eq('connection_id', connectionId)
    }
    await adminClient.from('source_connections').update({ status: 'syncing' }).eq('id', connectionId)
    try {
      const [contacts, deals, notes, calls] = await Promise.all([fetchAllContacts(accessToken), fetchAllDeals(accessToken), fetchAllNotes(accessToken), fetchAllCalls(accessToken)])
      const docs = [
        ...contacts.map((c) => contactToDocument(c, connection.workspace_id, connectionId)),
        ...deals.map((d) => dealToDocument(d, connection.workspace_id, connectionId)),
        ...notes.map((n) => noteToDocument(n, connection.workspace_id, connectionId)),
        ...calls.map((c) => callToDocument(c, connection.workspace_id, connectionId)),
      ]
      if (docs.length > 0) await adminClient.from('source_documents').upsert(docs, { onConflict: 'workspace_id,source_type,external_id' })
      const { count } = await adminClient.from('source_documents').select('*', { count: 'exact', head: true }).eq('connection_id', connectionId)
      await adminClient.from('source_connections').update({ status: 'active', last_synced_at: new Date().toISOString(), synced_count: count ?? 0, error_message: null }).eq('id', connectionId)
      return { synced: count ?? 0 }
    } catch (err) {
      await adminClient.from('source_connections').update({ status: 'error', error_message: err instanceof Error ? err.message : 'Sync failed' }).eq('id', connectionId)
      return { error: err instanceof Error ? err.message : 'Sync failed' }
    }
  }

  if (source_type === 'granola') {
    const { data: creds } = await adminClient
      .from('source_credentials')
      .select('access_token, refresh_token, expires_at')
      .eq('connection_id', connectionId)
      .single()
    if (!creds?.access_token) return { error: 'No Granola token' }
    let accessToken = creds.access_token
    if (creds.expires_at && new Date(creds.expires_at).getTime() - Date.now() < 60_000) {
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const refreshed = await refreshGranolaToken(creds.refresh_token ?? '', `${origin}/api/oauth/granola/metadata`)
      if (!refreshed) return { error: 'Could not refresh Granola token' }
      accessToken = refreshed.access_token
      await adminClient.from('source_credentials').update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? creds.refresh_token,
        ...(refreshed.expires_in ? { expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() } : {}),
      }).eq('connection_id', connectionId)
    }
    await adminClient.from('source_connections').update({ status: 'syncing' }).eq('id', connectionId)
    try {
      const meetingMeta = await listMeetingIds(accessToken)
      const ids = meetingMeta.map(m => m.id)
      const meetings = await getMeetingsWithSummary(accessToken, ids)
      const docs = meetings
        .filter(m => m.summary)
        .map(m => meetingToDocument(m, connection.workspace_id, connectionId))
      if (docs.length > 0) await adminClient.from('source_documents').upsert(docs, { onConflict: 'workspace_id,source_type,external_id' })
      const { count } = await adminClient.from('source_documents').select('*', { count: 'exact', head: true }).eq('connection_id', connectionId)
      await adminClient.from('source_connections').update({ status: 'active', last_synced_at: new Date().toISOString(), synced_count: count ?? 0, error_message: null }).eq('id', connectionId)
      return { synced: count ?? 0 }
    } catch (err) {
      await adminClient.from('source_connections').update({ status: 'error', error_message: err instanceof Error ? err.message : 'Sync failed' }).eq('id', connectionId)
      return { error: err instanceof Error ? err.message : 'Sync failed' }
    }
  }

  return { error: `No auto-sync for source_type: ${source_type}` }
}
