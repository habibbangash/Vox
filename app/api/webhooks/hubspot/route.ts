import { createHmac } from 'crypto'
import type { NextRequest } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import {
  refreshHubSpotToken,
  fetchNoteById, fetchCallById,
  noteToDocument, callToDocument,
} from '@/lib/sources/hubspot'

// HubSpot sends an array of notification events per request.
interface HubSpotEvent {
  eventId:          number
  subscriptionId:   number
  portalId:         number
  occurredAt:       number   // Unix ms
  subscriptionType: string   // e.g. "note.creation", "call.creation"
  objectId:         number
  changeSource?:    string
}

// ─── Signature verification (v3) ─────────────────────────────────────────────
// Spec: HMAC-SHA256(clientSecret, METHOD + fullUrl + rawBody + timestamp)
// Headers: X-HubSpot-Signature-v3, X-HubSpot-Request-Timestamp

function computeSignature(clientSecret: string, method: string, url: string, rawBody: string, timestamp: string): string {
  return createHmac('sha256', clientSecret)
    .update(`${method}${url}${rawBody}${timestamp}`)
    .digest('base64')
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function GET() {
  // HubSpot pings this URL during app configuration to verify it's reachable.
  return new Response('OK', { status: 200 })
}

export async function POST(request: NextRequest) {
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET
  if (!clientSecret) {
    console.error('[hubspot-webhook] HUBSPOT_CLIENT_SECRET not set')
    return new Response('Not configured', { status: 500 })
  }

  const rawBody = await request.text()
  const signatureHeader = request.headers.get('x-hubspot-signature-v3')
  const timestampHeader = request.headers.get('x-hubspot-request-timestamp')

  // Replay protection: reject if timestamp is older than 5 minutes
  if (!timestampHeader) {
    return new Response('Missing timestamp header', { status: 401 })
  }
  const ts = parseInt(timestampHeader, 10)
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 300_000) {
    return new Response('Request too old', { status: 401 })
  }

  // Signature verification
  if (signatureHeader) {
    const expected = computeSignature(clientSecret, 'POST', request.url, rawBody, timestampHeader)
    if (expected !== signatureHeader) {
      console.warn('[hubspot-webhook] signature mismatch')
      return new Response('Invalid signature', { status: 401 })
    }
  }

  let events: HubSpotEvent[]
  try {
    events = JSON.parse(rawBody)
    if (!Array.isArray(events)) throw new Error('Expected array')
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Process each event — only notes and calls carry content signal
  for (const event of events) {
    const { subscriptionType, objectId, portalId } = event

    if (subscriptionType !== 'note.creation' && subscriptionType !== 'call.creation') {
      continue
    }

    // Look up the workspace connection for this HubSpot portal
    const { data: connection } = await adminClient
      .from('source_connections')
      .select('id, workspace_id, status')
      .eq('source_type', 'hubspot')
      .eq('status', 'active')
      .filter('config->>hub_id', 'eq', String(portalId))
      .single()

    if (!connection) continue

    // Get credentials, refreshing if needed
    const { data: creds } = await adminClient
      .from('source_credentials')
      .select('access_token, refresh_token, expires_at')
      .eq('connection_id', connection.id)
      .single()

    if (!creds?.access_token) continue

    let accessToken = creds.access_token
    if (creds.expires_at && new Date(creds.expires_at) < new Date(Date.now() + 60_000)) {
      const refreshed = await refreshHubSpotToken(creds.refresh_token ?? '')
      if (!refreshed) continue
      accessToken = refreshed.access_token
      await adminClient
        .from('source_credentials')
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq('connection_id', connection.id)
    }

    const id = String(objectId)
    let doc: ReturnType<typeof noteToDocument> | ReturnType<typeof callToDocument> | null = null

    if (subscriptionType === 'note.creation') {
      const note = await fetchNoteById(accessToken, id)
      const body = note?.properties['hs_note_body'] ?? ''
      if (!note || body.trim().length < 30) continue
      doc = noteToDocument(note, connection.workspace_id, connection.id)
    } else {
      const call = await fetchCallById(accessToken, id)
      const body = call?.properties['hs_call_body'] ?? ''
      if (!call || body.trim().length < 30) continue
      doc = callToDocument(call, connection.workspace_id, connection.id)
    }

    if (!doc) continue

    await adminClient
      .from('source_documents')
      .upsert(doc, { onConflict: 'workspace_id,source_type,external_id' })

    await adminClient
      .from('source_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id)
  }

  // Always respond 200 quickly — HubSpot retries on non-2xx
  return new Response('OK', { status: 200 })
}
