import Link from 'next/link'
import { FileText, Layers, TrendingUp, Zap, CheckCircle2, Circle } from 'lucide-react'
import { verifySession, getWorkspaceMembership } from '@/lib/supabase/dal'
import { adminClient } from '@/lib/supabase/admin'
import { getWorkspaceSettings } from '@/app/actions/workspace'
import { relativeTime } from '@/lib/utils'
import { WorkflowDiagram } from './_components/workflow-diagram'
import { OnboardingComplete } from './_components/onboarding-complete'

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
    wsSettings,
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
      ? adminClient.from('source_connections').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'active').neq('source_type', 'linkedin')
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
    getWorkspaceSettings(),
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

  // Onboarding checklist — shown until all steps are done
  const hasKey = !!(wsSettings as { anthropic_api_key?: string }).anthropic_api_key || !!process.env.ANTHROPIC_API_KEY
  const steps = [
    { done: true,                     label: 'Workspace created',                        href: null,       optional: false },
    { done: (sourceCount ?? 0) > 0,   label: 'Connect a source',                         href: '/sources', optional: false },
    { done: (docCount ?? 0) > 0,      label: 'Sync your first content (takes 2–5 min)',  href: '/sources', optional: false },
    { done: (signalCount ?? 0) > 0,   label: 'Generate a signal (auto or manual)',       href: '/content', optional: false },
    { done: (draftCount ?? 0) > 0,    label: 'Create your first draft',                  href: '/content', optional: false },
    { done: hasKey,                    label: 'Add Anthropic API key',                    href: '/settings', optional: true  },
  ]
  const allDone = steps.filter(s => !s.optional).every((s) => s.done)

  return (
    <div className="p-4 sm:p-8 max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {workspace?.name ?? 'Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
      </div>

      {/* Onboarding checklist */}
      {!allDone && (
        <section className="rounded-lg border bg-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-medium">Quick start</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Follow these steps to get your first AI-generated draft. Takes about 10 minutes.
            </p>
          </div>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {step.done
                  ? <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                  : <Circle className="size-4 text-muted-foreground/40 shrink-0" />}
                {step.href && !step.done ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      href={step.href}
                      className="text-sm text-primary hover:underline underline-offset-2"
                    >
                      {step.label}
                    </Link>
                    {step.optional && (
                      <span className="shrink-0 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">optional</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-sm ${step.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {step.label}
                    </span>
                    {step.optional && !step.done && (
                      <span className="shrink-0 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">optional</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Onboarding complete celebration */}
      {allDone && (
        <OnboardingComplete workspaceName={workspace?.name ?? 'Your workspace'} />
      )}

      {/* Workflow diagram */}
      <WorkflowDiagram
        sourceCount={sourceCount ?? 0}
        docCount={docCount ?? 0}
        signalCount={signalCount ?? 0}
        draftCount={draftCount ?? 0}
      />

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
            <div className="rounded-lg border border-dashed py-6 text-center space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">No signals yet</p>
              <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                Signals appear after data is ingested from your sources.
              </p>
              <Link href="/sources" className="text-xs text-primary underline underline-offset-2 block">
                → Connect a source first
              </Link>
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
            <div className="rounded-lg border border-dashed py-6 text-center space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">No drafts yet</p>
              <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                Once you have signals, turn them into LinkedIn posts, emails, or blog posts.
              </p>
              <Link href="/content" className="text-xs text-primary underline underline-offset-2 block">
                → Go to Content
              </Link>
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
              const conn = c as { source_type: string; display_name: string | null; synced_count: number | null; last_synced_at: string | null }
              return (
              <div key={i} className="rounded-md border bg-card px-3 py-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium capitalize">{conn.source_type}</span>
                {conn.display_name && (
                  <span className="text-xs text-muted-foreground">— {conn.display_name}</span>
                )}
                {conn.synced_count !== null && conn.source_type !== 'linkedin' && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({conn.synced_count.toLocaleString()} docs)
                  </span>
                )}
                {conn.last_synced_at && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {relativeTime(conn.last_synced_at)}
                  </span>
                )}
              </div>
            )})}
          </div>
        </section>
      )}
    </div>
  )
}
