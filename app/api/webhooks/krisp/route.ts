import type { NextRequest } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { type KrispWebhookPayload, extractDocumentFields } from '@/lib/sources/krisp'

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return new Response('Missing token', { status: 401 })

  const { data: connection } = await adminClient
    .from('source_connections')
    .select('id, workspace_id, status, synced_count')
    .eq('webhook_secret', token)
    .eq('source_type', 'krisp')
    .single()

  if (!connection || connection.status === 'disconnected') {
    return new Response('Invalid token', { status: 401 })
  }

  let body: KrispWebhookPayload
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { external_id, title, content, author_name } = extractDocumentFields(body)

  if (!content) {
    return new Response('No transcript content', { status: 422 })
  }

  const { error: docError } = await adminClient
    .from('source_documents')
    .upsert(
      {
        workspace_id: connection.workspace_id,
        connection_id: connection.id,
        source_type: 'krisp',
        external_id,
        title,
        content,
        author_name,
        metadata: body as Record<string, unknown>,
        processed: false,
        ingested_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,source_type,external_id' }
    )

  if (docError) {
    console.error('[krisp webhook] doc upsert failed:', docError.message)
    return new Response('Internal error', { status: 500 })
  }

  await adminClient
    .from('source_connections')
    .update({
      last_synced_at: new Date().toISOString(),
      synced_count: (connection.synced_count ?? 0) + 1,
      status: 'active',
      error_message: null,
    })
    .eq('id', connection.id)

  return new Response('OK', { status: 200 })
}
