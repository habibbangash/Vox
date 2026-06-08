import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { syncConnectionInternal } from '@/lib/sources/sync-connection'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: connections } = await adminClient
    .from('source_connections')
    .select('id, source_type, workspace_id')
    .eq('status', 'active')
    .in('source_type', ['rss', 'slack', 'gmail', 'hubspot', 'granola', 'notion'])

  if (!connections?.length) {
    return NextResponse.json({ ok: true, synced: 0, message: 'No active connections' })
  }

  const results = await Promise.allSettled(
    connections.map((conn) => syncConnectionInternal(conn.id))
  )

  const summary = results.map((r, i) => ({
    id: connections[i].id,
    type: connections[i].source_type,
    ...(r.status === 'fulfilled' ? r.value : { error: String(r.reason) }),
  }))

  // Recompute signals directly via adminClient — server actions require a user
  // session which is not available in cron context
  await adminClient.rpc('compute_signals')

  return NextResponse.json({ ok: true, connections: summary })
}
