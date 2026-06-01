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
    return <div className="p-4 sm:p-8 text-sm text-muted-foreground">No workspace found.</div>
  }

  const [
    { data: docRows },
    { data: signalRows },
    { data: statusRows },
    { data: formatRows },
  ] = await Promise.all([
    adminClient.rpc('analytics_docs_by_source',   { p_workspace_id: workspaceId }),
    adminClient.rpc('analytics_signals_summary',  { p_workspace_id: workspaceId }),
    adminClient.rpc('analytics_drafts_by_status', { p_workspace_id: workspaceId }),
    adminClient.rpc('analytics_drafts_by_format', { p_workspace_id: workspaceId }),
  ])

  type DocRow     = { source_type: string; cnt: number }
  type SignalRow  = { signal_type: string; active_cnt: number; dismissed_cnt: number }
  type StatusRow  = { status: string; cnt: number }
  type FormatRow  = { format: string; cnt: number }

  const docsBySource: Record<string, number> = Object.fromEntries(((docRows ?? []) as DocRow[]).map(r => [r.source_type, Number(r.cnt)]))
  const totalDocs    = Object.values(docsBySource).reduce((s, n) => s + n, 0)
  const maxDocSource = Math.max(...Object.values(docsBySource), 1)

  const signalsByType: Record<string, number> = Object.fromEntries(((signalRows ?? []) as SignalRow[]).map(r => [r.signal_type, Number(r.active_cnt)]))
  const activeSignalsCount    = Object.values(signalsByType).reduce((s, n) => s + n, 0)
  const dismissedSignalsCount = ((signalRows ?? []) as SignalRow[]).reduce((s, r) => s + Number(r.dismissed_cnt), 0)
  const maxSignal = Math.max(...Object.values(signalsByType), 1)

  const draftsByStatus: Record<string, number> = Object.fromEntries(((statusRows ?? []) as StatusRow[]).map(r => [r.status, Number(r.cnt)]))
  const draftsByFormat: Record<string, number> = Object.fromEntries(((formatRows ?? []) as FormatRow[]).map(r => [r.format, Number(r.cnt)]))
  const totalDrafts    = Object.values(draftsByStatus).reduce((s, n) => s + n, 0)
  const publishedCount = draftsByStatus['published'] ?? 0
  const maxDraftStatus = Math.max(...Object.values(draftsByStatus), 1)

  const orderedSources  = Object.keys(SOURCE_LABELS).filter(k => docsBySource[k] > 0)
  const orderedStatuses = ['brief', 'draft', 'review', 'published'].filter(k => draftsByStatus[k] > 0)
  const orderedSignals  = Object.keys(SIGNAL_LABELS).filter(k => signalsByType[k] > 0)

  return (
    <div className="p-4 sm:p-8 max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Pipeline health and content output for your workspace.
        </p>
      </div>

      {/* Top-line stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Documents"        value={totalDocs}        sub="across all sources"  href="/intelligence" />
        <StatCard label="Active signals"   value={activeSignalsCount} sub={`${dismissedSignalsCount} dismissed`} href="/content" />
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
            <p className="text-xs text-muted-foreground mt-0.5">{activeSignalsCount} active · {dismissedSignalsCount} dismissed</p>
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
