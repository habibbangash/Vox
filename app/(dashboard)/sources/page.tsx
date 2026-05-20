import { verifySession } from '@/lib/supabase/dal'
import { adminClient } from '@/lib/supabase/admin'
import { KrispCard } from './_components/krisp-card'
import { RssSection } from './_components/rss-section'

export default async function SourcesPage() {
  const { user } = await verifySession()

  const [{ data: krispConnection }, { data: rssConnections }] = await Promise.all([
    adminClient
      .from('source_connections')
      .select('id, status, webhook_secret, last_synced_at, synced_count')
      .eq('user_id', user.id)
      .eq('source_type', 'krisp')
      .single(),
    adminClient
      .from('source_connections')
      .select('id, display_name, status, config, last_synced_at, synced_count, error_message')
      .eq('user_id', user.id)
      .eq('source_type', 'rss')
      .order('created_at', { ascending: true }),
  ])

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Sources</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Connect your meeting tools and content feeds to automatically ingest data into your workspace.
      </p>

      <div className="space-y-4">
        <KrispCard connection={krispConnection ?? null} />
        <RssSection connections={(rssConnections ?? []) as Parameters<typeof RssSection>[0]['connections']} />
      </div>
    </div>
  )
}
