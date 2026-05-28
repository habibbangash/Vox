import Link from 'next/link'
import { FileText, Layers, TrendingUp, Zap } from 'lucide-react'
import { verifySession, getWorkspaceMembership } from '@/lib/supabase/dal'
import { adminClient } from '@/lib/supabase/admin'

export default async function DashboardPage() {
  const { user } = await verifySession()
  const membership = await getWorkspaceMembership()
  const workspace = membership?.workspaces as unknown as { id: string; name: string } | null
  const workspaceId = workspace?.id

  const [
    { count: docCount },
    { count: signalCount },
    { count: draftCount },
    { count: sourceCount },
    { data: recentSignals },
    { data: recentDrafts },
    { data: connections },
  ] = await Promise.all([
    workspaceId
      ? adminClient.from('source_documents').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId)
      : Promise.resolve({ count: 0 }),
    workspaceId
      ? adminClient.from('signals').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId)
      : Promise.resolve({ count: 0 }),
    workspaceId
      ? adminClient.from('content_drafts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId)
      : Promise.resolve({ count: 0 }),
    workspaceId
      ? adminClient.from('source_connections').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'active')
      : Promise.resolve({ count: 0 }),
    workspaceId
      ? adminClient.from('signals').select('id, title, signal_type, document_count, source_count').eq('workspace_id', workspaceId).order('document_count', { ascending: false }).limit(3)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? adminClient.from('content_drafts').select('id, title, format, status, updated_at').eq('workspace_id', workspaceId).order('updated_at', { ascending: false }).limit(3)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? adminClient.from('source_connections').select('source_type, display_name, status, last_synced_at, synced_count').eq('workspace_id', workspaceId).eq('status', 'active')
      : Promise.resolve({ data: [] }),
  ])

  const stats = [
    { label: 'Documents',      value: docCount ?? 0,    icon: Layers,     href: '/intelligence' },
    { label: 'Signals',        value: signalCount ?? 0, icon: TrendingUp,  href: '/content'      },
    { label: 'Drafts',         value: draftCount ?? 0,  icon: FileText,    href: '/content'      },
    { label: 'Active sources', value: sourceCount ?? 0, icon: Zap,         href: '/sources'      },
  ]

  const SIGNAL_TYPE_LABEL: Record<string, string> = {
    recurring_topic:    'Topic',
    objection_trend:    'Objection',
    buying_signal:      'Buying signal',
    competitor_mention: 'Competitor',
  }
  const FORMAT_LABEL: Record<string, string> = {
    linkedin_post:  'LinkedIn',
    email_sequence: 'Email',
    blog_post:      'Blog',
    battle_card:    'Battle card',
  }
  const STATUS_STYLE: Record<string, string> = {
    brief:     'text-muted-foreground',
    draft:     'text-blue-600',
    review:    'text-amber-600',
    published: 'text-green-600',
  }

  return (
    <div className="p-8 max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {workspace?.name ?? 'Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-lg border bg-card px-4 py-3 hover:bg-muted/40 transition-colors space-y-1"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Recent signals */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Top Signals</h2>
            <Link href="/content" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          {(recentSignals ?? []).length > 0 ? (
            <div className="space-y-2">
              {(recentSignals ?? []).map((s) => {
                const sig = s as { id: string; title: string; signal_type: string; document_count: number; source_count: number }
                return (
                <div key={sig.id} className="rounded-lg border bg-card px-3 py-2.5 space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{sig.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0 bg-muted rounded-full px-2 py-0.5">
                      {SIGNAL_TYPE_LABEL[sig.signal_type] ?? sig.signal_type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sig.document_count} doc{sig.document_count !== 1 ? 's' : ''} · {sig.source_count} source{sig.source_count !== 1 ? 's' : ''}
                  </p>
                </div>
              )})}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-6 text-center">
              <p className="text-xs text-muted-foreground">
                No signals yet.{' '}
                <Link href="/sources" className="underline underline-offset-2">
                  Connect sources
                </Link>{' '}
                to start.
              </p>
            </div>
          )}
        </section>

        {/* Recent drafts */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Recent Drafts</h2>
            <Link href="/content" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          {(recentDrafts ?? []).length > 0 ? (
            <div className="space-y-2">
              {(recentDrafts ?? []).map((d) => {
                const draft = d as { id: string; title: string; format: string; status: string }
                return (
                <div key={draft.id} className="rounded-lg border bg-card px-3 py-2.5 space-y-0.5">
                  <p className="text-sm font-medium leading-snug truncate">{draft.title}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{FORMAT_LABEL[draft.format] ?? draft.format}</span>
                    <span className={STATUS_STYLE[draft.status] ?? ''}>{draft.status}</span>
                  </div>
                </div>
              )})}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-6 text-center">
              <p className="text-xs text-muted-foreground">
                No drafts yet.{' '}
                <Link href="/content" className="underline underline-offset-2">
                  Generate from a signal
                </Link>
                .
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Connected sources */}
      {(connections ?? []).length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Connected Sources</h2>
            <Link href="/sources" className="text-xs text-muted-foreground hover:text-foreground">
              Manage →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {(connections ?? []).map((c, i) => {
              const conn = c as { source_type: string; display_name: string | null; synced_count: number | null }
              return (
              <div key={i} className="rounded-md border bg-card px-3 py-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium capitalize">{conn.source_type}</span>
                {conn.display_name && (
                  <span className="text-xs text-muted-foreground">— {conn.display_name}</span>
                )}
                {conn.synced_count !== null && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({conn.synced_count.toLocaleString()} docs)
                  </span>
                )}
              </div>
            )})}
          </div>
        </section>
      )}

      {/* Zero-state CTA */}
      {(docCount ?? 0) === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
          <p className="text-sm font-medium">Ready to start</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Connect your first source to begin ingesting meeting transcripts, articles, and CRM data into Vox.
          </p>
          <Link
            href="/sources"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            Connect a source
          </Link>
        </div>
      )}
    </div>
  )
}
