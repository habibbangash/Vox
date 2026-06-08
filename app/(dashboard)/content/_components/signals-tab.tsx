'use client'
import { useState, useTransition } from 'react'
import { AlertCircle, Loader2, RefreshCw, Sparkles, Star, TrendingUp, Zap, Swords, X } from 'lucide-react'
import { type Signal, type SignalType, type ContentFormat, computeSignals, generateDraftFromSignal, dismissSignal, pinSignal } from '@/app/actions/content'
import { type Persona } from '@/app/actions/personas'
import { useRouter } from 'next/navigation'

const SIGNAL_META: Record<SignalType, { label: string; icon: React.ComponentType<{ className?: string }>; chip: string }> = {
  recurring_topic:    { label: 'Recurring Topic',     icon: TrendingUp,  chip: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'    },
  objection_trend:    { label: 'Objection Trend',     icon: AlertCircle, chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  buying_signal:      { label: 'Buying Signal',       icon: Zap,         chip: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
  competitor_mention: { label: 'Competitor Mention',  icon: Swords,      chip: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'         },
}

const FILTER_OPTIONS: { value: SignalType | 'all'; label: string }[] = [
  { value: 'all',                label: 'All'               },
  { value: 'recurring_topic',    label: 'Recurring Topics'  },
  { value: 'objection_trend',    label: 'Objections'        },
  { value: 'buying_signal',      label: 'Buying Signals'    },
  { value: 'competitor_mention', label: 'Competitors'       },
]

interface SignalsTabProps {
  signals:        Signal[]
  personas?:      Persona[]
  onDraftCreated: (draftId: string) => void
}

export function SignalsTab({ signals, personas = [], onDraftCreated }: SignalsTabProps) {
  const router = useRouter()
  const [refreshPending, startRefresh] = useTransition()
  const [generating, setGenerating] = useState<string | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<SignalType | 'all'>('all')
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(
    new Set(signals.filter(s => s.pinned_at).map(s => s.id))
  )
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)

  const visible = signals
    .filter(s => !dismissedIds.has(s.id))
    .sort((a, b) => {
      const aPinned = pinnedIds.has(a.id) ? 0 : 1
      const bPinned = pinnedIds.has(b.id) ? 0 : 1
      return aPinned - bPinned
    })
  const filtered = activeFilter === 'all'
    ? visible
    : visible.filter(s => s.signal_type === activeFilter)

  async function handleDismiss(signalId: string) {
    setDismissedIds(prev => new Set([...prev, signalId]))
    await dismissSignal(signalId)
  }

  async function handlePin(signalId: string) {
    const nowPinned = !pinnedIds.has(signalId)
    setPinnedIds(prev => {
      const next = new Set(prev)
      nowPinned ? next.add(signalId) : next.delete(signalId)
      return next
    })
    await pinSignal(signalId, nowPinned)
  }

  function handleRefresh() {
    startRefresh(async () => {
      await computeSignals()
      router.refresh()
    })
  }

  async function handleDraft(signalId: string, format: ContentFormat) {
    const key = `${signalId}:${format}`
    setGenerating(key)
    setGenError(null)
    const result = await generateDraftFromSignal(signalId, format, selectedPersonaId)
    setGenerating(null)
    if (result?.error) {
      setGenError(result.error)
    } else {
      router.refresh()
      onDraftCreated(result.draftId ?? '')
    }
  }

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-start gap-3">
        <Sparkles className="size-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">What are signals?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Signals detect content opportunities by clustering similar topics across your meetings, articles, and conversations.
            When multiple sources mention the same theme, Vox surfaces it as a ready-to-draft opportunity.
          </p>
        </div>
      </div>

      {genError && (
        <p className="text-xs text-destructive rounded-md bg-destructive/10 px-3 py-2">{genError}</p>
      )}

      {personas.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Persona:</span>
          <button
            onClick={() => setSelectedPersonaId(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedPersonaId === null
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPersonaId(p.id === selectedPersonaId ? null : p.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedPersonaId === p.id
                  ? 'text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
              style={selectedPersonaId === p.id ? { backgroundColor: p.color } : {}}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {visible.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setActiveFilter(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeFilter === opt.value
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                  {opt.value !== 'all' && (
                    <span className="ml-1 opacity-60">
                      {visible.filter(s => s.signal_type === opt.value).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {filtered.length} of {visible.length} signal{visible.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleRefresh}
                disabled={refreshPending}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${refreshPending ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No {FILTER_OPTIONS.find(o => o.value === activeFilter)?.label.toLowerCase()} signals detected yet.
            </p>
          )}

          <div className="space-y-2">
            {filtered.map((signal) => {
              const meta = SIGNAL_META[signal.signal_type]
              const Icon = meta.icon
              return (
                <div key={signal.id} className="rounded-lg border bg-card px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm font-medium leading-snug">{signal.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${meta.chip}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                        {signal.source_count} source{signal.source_count !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => handlePin(signal.id)}
                        title={pinnedIds.has(signal.id) ? 'Unpin' : 'Pin'}
                        className={`transition-colors ${pinnedIds.has(signal.id) ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <Star className={`size-3.5 ${pinnedIds.has(signal.id) ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDismiss(signal.id)}
                        title="Dismiss signal"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  {signal.description && (
                    <p className="text-xs text-muted-foreground pl-6">{signal.description}</p>
                  )}
                  <div className="pl-6 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      {signal.document_count} doc{signal.document_count !== 1 ? 's' : ''} · {signal.source_count} source{signal.source_count !== 1 ? 's' : ''} · {new Date(signal.computed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-3 text-muted-foreground shrink-0" />
                      {(['linkedin_post', 'newsletter', 'blog_post', 'email_sequence', 'marketing_email', 'linkedin_ad', 'battle_card'] as ContentFormat[]).map((fmt) => {
                        const fmtKey = `${signal.id}:${fmt}`
                        const fmtLabel: Record<ContentFormat, string> = {
                          linkedin_post:   'LinkedIn',
                          newsletter:      'Newsletter',
                          blog_post:       'Blog',
                          email_sequence:  'Cold email',
                          marketing_email: 'Mktg email',
                          linkedin_ad:     'LinkedIn ad',
                          battle_card:     'Battle card',
                        }
                        return (
                          <button
                            key={fmt}
                            onClick={() => handleDraft(signal.id, fmt)}
                            disabled={generating !== null}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                          >
                            {generating === fmtKey && <Loader2 className="size-3 animate-spin" />}
                            {fmtLabel[fmt]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : dismissedIds.size > 0 && signals.length > 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
          <TrendingUp className="size-5 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">All signals dismissed</p>
          <p className="text-xs text-muted-foreground">
            Refresh to recompute signals from your latest content.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshPending}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshPending ? 'animate-spin' : ''}`} />
            Refresh signals
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
          <TrendingUp className="size-5 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">No signals yet</p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Signals are recurring themes detected across your meetings, articles, and conversations.
            They appear once you&apos;ve connected a source and data has been ingested.
          </p>
          <div className="flex flex-col items-center gap-1.5 pt-1">
            <a href="/sources" className="text-xs text-primary underline underline-offset-2 hover:opacity-80">
              → Connect a source to get started (2 min)
            </a>
            <button
              onClick={handleRefresh}
              disabled={refreshPending}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${refreshPending ? 'animate-spin' : ''}`} />
              {refreshPending ? 'Computing…' : 'Already have data? Compute signals now'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
