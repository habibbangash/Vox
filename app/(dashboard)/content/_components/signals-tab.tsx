'use client'
import { useTransition } from 'react'
import { AlertCircle, RefreshCw, Sparkles, TrendingUp, Zap, Swords } from 'lucide-react'
import { type Signal, type SignalType, computeSignals } from '@/app/actions/content'
import { useRouter } from 'next/navigation'

const SIGNAL_META: Record<SignalType, { label: string; icon: React.ComponentType<{ className?: string }>; chip: string }> = {
  recurring_topic:    { label: 'Recurring Topic',     icon: TrendingUp,  chip: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'    },
  objection_trend:    { label: 'Objection Trend',     icon: AlertCircle, chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  buying_signal:      { label: 'Buying Signal',       icon: Zap,         chip: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
  competitor_mention: { label: 'Competitor Mention',  icon: Swords,      chip: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'         },
}

interface SignalsTabProps {
  signals: Signal[]
}

export function SignalsTab({ signals }: SignalsTabProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleRefresh() {
    startTransition(async () => {
      await computeSignals()
      router.refresh()
    })
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

      {signals.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="size-3.5" />
              {signals.length} signal{signals.length !== 1 ? 's' : ''} detected
            </div>
            <button
              onClick={handleRefresh}
              disabled={pending}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${pending ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="space-y-2">
            {signals.map((signal) => {
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
                    </div>
                  </div>
                  {signal.description && (
                    <p className="text-xs text-muted-foreground pl-6">{signal.description}</p>
                  )}
                  <div className="pl-6 pt-0.5">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Sparkles className="size-3" />
                      Draft LinkedIn post · Draft email
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
          <TrendingUp className="size-5 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">No signals yet</p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Add an <code className="bg-muted rounded px-1 py-0.5">ANTHROPIC_API_KEY</code> to Supabase Edge Function secrets,
            then ingest content. Signals will appear automatically once entities are extracted across multiple sources.
          </p>
          <button
            onClick={handleRefresh}
            disabled={pending}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${pending ? 'animate-spin' : ''}`} />
            Check now
          </button>
        </div>
      )}
    </div>
  )
}
