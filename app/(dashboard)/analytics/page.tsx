import Link from 'next/link'
import { getWorkspaceMembership } from '@/lib/supabase/dal'
import { adminClient } from '@/lib/supabase/admin'

const SOURCE_LABELS: Record<string, string> = {
  krisp:   'Krisp',
  rss:     'RSS',
  slack:   'Slack',
  gmail:   'Gmail',
  hubspot: 'HubSpot',
  granola: 'Granola',
  manual:  'Manual',
}
const SOURCE_COLORS: Record<string, string> = {
  krisp:   'bg-violet-500',
  rss:     'bg-blue-500',
  slack:   'bg-green-500',
  gmail:   'bg-red-500',
  hubspot: 'bg-orange-500',
  granola: 'bg-amber-500',
  manual:  'bg-slate-400',
}

const SIGNAL_LABELS: Record<string, string> = {
  recurring_topic:    'Recurring Topics',
  objection_trend:    'Objection Trends',
  buying_signal:      'Buying Signals',
  competitor_mention: 'Competitor Mentions',
}
const SIGNAL_COLORS: Record<string, string> = {
  recurring_topic:    'bg-blue-500',
  objection_trend:    'bg-amber-500',
  buying_signal:      'bg-green-500',
  competitor_mention: 'bg-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  brief:     'Brief',
  draft:     'Draft',
  review:    'Review',
  published: 'Published',
}
const STATUS_COLORS: Record<string, string> = {
  brief:     'bg-slate-400',
  draft:     'bg-blue-500',
  review:    'bg-amber-500',
  published: 'bg-green-500',
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-xs font-medium text-right tabular-nums">{value}</span>
    </div>
  )
}

function StatCard({ label, value, sub, href }: { label: string; value: number; sub?: string; href?: string }) {
  const content = (
    <div className="rounded-lg border bg-card px-5 py-4 space-y-1 hover:bg-muted/40 transition-colors">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

export default async function AnalyticsPage() {
  const membership = await getWorkspaceMembership()
  const workspace = membership?.workspaces as unknown as { id: string; name: string } | null
  const workspaceId = workspace?.id

  if (!workspaceId) {
    return <div className="p-8 text-sm text-muted-foreground">No workspace found.</div>
  }

  const [
    { data: docs },
    { data: signals },
    { data: drafts },
  ] = await Promise.all([
    adminClient
      .from('source_documents')
      .select('source_type')
      .eq('workspace_id', workspaceId),
    adminClient
      .from('signals')
      .select('signal_type, dismissed_at')
      .eq('workspace_id', workspaceId),
    adminClient
      .from('content_drafts')
      .select('status, format, published_url, published_at, updated_at')
      .eq('workspace_id', workspaceId),
  ])

  // Aggregate docs by source_type
  const docsBySource: Record<string, number> = {}
  for (const d of docs ?? []) {
    docsBySource[d.source_type] = (docsBySource[d.source_type] ?? 0) + 1
  }
  const totalDocs = (docs ?? []).length
  const maxDocSource = Math.max(...Object.values(docsBySource), 1)

  // Aggregate signals
  const activeSignals = (signals ?? []).filter(s => !s.dismissed_at)
  const dismissedSignals = (signals ?? []).filter(s => s.dismissed_at)
  const signalsByType: Record<string, number> = {}
  for (const s of activeSignals) {
    signalsByType[s.signal_type] = (signalsByType[s.signal_type] ?? 0) + 1
  }
  const maxSignal = Math.max(...Object.values(signalsByType), 1)

  // Aggregate drafts
  const draftsByStatus: Record<string, number> = {}
  const draftsByFormat: Record<string, number> = {}
  for (const d of drafts ?? []) {
    draftsByStatus[d.status] = (draftsByStatus[d.status] ?? 0) + 1
    draftsByFormat[d.format] = (draftsByFormat[d.format] ?? 0) + 1
  }
  const totalDrafts    = (drafts ?? []).length
  const publishedCount = draftsByStatus['published'] ?? 0
  const maxDraftStatus = Math.max(...Object.values(draftsByStatus), 1)

  const orderedSources  = Object.keys(SOURCE_LABELS).filter(k => docsBySource[k] > 0)
  const orderedStatuses = ['brief', 'draft', 'review', 'published'].filter(k => draftsByStatus[k] > 0)
  const orderedSignals  = Object.keys(SIGNAL_LABELS).filter(k => signalsByType[k] > 0)

  return (
    <div className="p-8 max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Pipeline health and content output for your workspace.
        </p>
      </div>

      {/* Top-line stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Documents"        value={totalDocs}        sub="across all sources"  href="/intelligence" />
        <StatCard label="Active signals"   value={activeSignals.length} sub={`${dismissedSignals.length} dismissed`} href="/content" />
        <StatCard label="Drafts"           value={totalDrafts}      sub="all statuses"        href="/content" />
        <StatCard label="Published"        value={publishedCount}   sub="posts sent"          href="/content" />
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {/* Documents by source */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-medium">Documents by source</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{totalDocs.toLocaleString()} total ingested</p>
          </div>
          {orderedSources.length > 0 ? (
            <div className="space-y-2.5">
              {orderedSources.map(k => (
                <BarRow
                  key={k}
                  label={SOURCE_LABELS[k]}
                  value={docsBySource[k]}
                  max={maxDocSource}
                  color={SOURCE_COLORS[k] ?? 'bg-muted-foreground'}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No documents yet.{' '}
              <Link href="/sources" className="underline underline-offset-2">Connect a source →</Link>
            </p>
          )}
        </section>

        {/* Draft pipeline */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-medium">Draft pipeline</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{totalDrafts} draft{totalDrafts !== 1 ? 's' : ''} total</p>
          </div>
          {orderedStatuses.length > 0 ? (
            <div className="space-y-2.5">
              {orderedStatuses.map(k => (
                <BarRow
                  key={k}
                  label={STATUS_LABELS[k]}
                  value={draftsByStatus[k]}
                  max={maxDraftStatus}
                  color={STATUS_COLORS[k] ?? 'bg-muted-foreground'}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No drafts yet.{' '}
              <Link href="/content" className="underline underline-offset-2">Generate from a signal →</Link>
            </p>
          )}
        </section>

        {/* Signals by type */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-medium">Active signals by type</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{activeSignals.length} active · {dismissedSignals.length} dismissed</p>
          </div>
          {orderedSignals.length > 0 ? (
            <div className="space-y-2.5">
              {orderedSignals.map(k => (
                <BarRow
                  key={k}
                  label={SIGNAL_LABELS[k]}
                  value={signalsByType[k]}
                  max={maxSignal}
                  color={SIGNAL_COLORS[k] ?? 'bg-muted-foreground'}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No active signals.{' '}
              <Link href="/content" className="underline underline-offset-2">Check Content →</Link>
            </p>
          )}
        </section>

        {/* Format breakdown */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-medium">Drafts by format</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Content type distribution</p>
          </div>
          {Object.keys(draftsByFormat).length > 0 ? (
            <div className="space-y-2.5">
              {Object.entries(draftsByFormat)
                .sort((a, b) => b[1] - a[1])
                .map(([fmt, count]) => {
                  const labels: Record<string, string> = {
                    linkedin_post: 'LinkedIn Post', email_sequence: 'Email Sequence',
                    blog_post: 'Blog Post', battle_card: 'Battle Card',
                  }
                  return (
                    <BarRow
                      key={fmt}
                      label={labels[fmt] ?? fmt}
                      value={count}
                      max={Math.max(...Object.values(draftsByFormat))}
                      color="bg-foreground/70"
                    />
                  )
                })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No drafts yet.</p>
          )}
        </section>
      </div>
    </div>
  )
}
