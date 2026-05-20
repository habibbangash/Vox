import { verifySession } from '@/lib/supabase/dal'
import { adminClient } from '@/lib/supabase/admin'
import { KrispCard } from './_components/krisp-card'

export default async function SourcesPage() {
  const { user } = await verifySession()

  const { data: krispConnection } = await adminClient
    .from('source_connections')
    .select('id, status, webhook_secret, last_synced_at, synced_count')
    .eq('user_id', user.id)
    .eq('source_type', 'krisp')
    .single()

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Sources</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Connect your meeting tools to automatically ingest transcripts into your workspace.
      </p>

      <div className="space-y-4">
        <KrispCard connection={krispConnection ?? null} />
      </div>
    </div>
  )
}
