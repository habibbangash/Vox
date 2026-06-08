'use client'
import { useState, useEffect } from 'react'
import { AlertCircle, Loader2, Sparkles, Swords, TrendingUp, X, Zap, ArrowRight, CheckCircle2 } from 'lucide-react'
import { type Signal, type SignalType, type ContentFormat, generateDraftFromSignal } from '@/app/actions/content'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'vox_first_draft_modal_dismissed'

const SIGNAL_ICONS: Record<SignalType, React.ComponentType<{ className?: string }>> = {
  recurring_topic:    TrendingUp,
  objection_trend:    AlertCircle,
  buying_signal:      Zap,
  competitor_mention: Swords,
}

const SIGNAL_CHIP: Record<SignalType, string> = {
  recurring_topic:    'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  objection_trend:    'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  buying_signal:      'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  competitor_mention: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
}

const SIGNAL_LABEL: Record<SignalType, string> = {
  recurring_topic:    'Recurring Topic',
  objection_trend:    'Objection Trend',
  buying_signal:      'Buying Signal',
  competitor_mention: 'Competitor Mention',
}

const FORMATS: { value: ContentFormat; label: string; description: string; emoji: string }[] = [
  { value: 'linkedin_post',   label: 'LinkedIn post',   emoji: '💼', description: '~300 words, thought leadership'  },
  { value: 'newsletter',      label: 'Newsletter',      emoji: '📰', description: '400–600 words, insight + hook'   },
  { value: 'blog_post',       label: 'Blog post',       emoji: '✍️', description: 'Long-form, 500+ words'           },
  { value: 'email_sequence',  label: 'Cold email',      emoji: '📧', description: 'Subject + body, 100–150 words'   },
  { value: 'marketing_email', label: 'Marketing email', emoji: '📣', description: 'Nurture email, 150–200 words'    },
  { value: 'linkedin_ad',     label: 'LinkedIn ad',     emoji: '🎯', description: 'Headline + 75-word body + CTA'   },
  { value: 'battle_card',     label: 'Battle card',     emoji: '⚔️', description: 'Sales enablement one-pager'      },
]

type Step = 'pick-signal' | 'pick-format' | 'generating' | 'done'

interface FirstDraftModalProps {
  signals:        Signal[]
  onDraftCreated: (draftId: string) => void
}

export function FirstDraftModal({ signals, onDraftCreated }: FirstDraftModalProps) {
  const [open,            setOpen]            = useState(false)
  const [step,            setStep]            = useState<Step>('pick-signal')
  const [selectedSignal,  setSelectedSignal]  = useState<Signal | null>(null)
  const [selectedFormat,  setSelectedFormat]  = useState<ContentFormat | null>(null)
  const [error,           setError]           = useState<string | null>(null)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed && signals.length > 0) setOpen(true)
  }, [signals.length])

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  function handlePickSignal(signal: Signal) {
    setSelectedSignal(signal)
    setStep('pick-format')
  }

  async function handleGenerate() {
    if (!selectedSignal || !selectedFormat) return
    setError(null)
    setStep('generating')

    const result = await generateDraftFromSignal(selectedSignal.id, selectedFormat)

    if (result?.error) {
      setError(result.error)
      setStep('pick-format')
    } else {
      setStep('done')
      // Brief pause so user sees the success state, then hand off
      setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, '1')
        setOpen(false)
        onDraftCreated(result.draftId ?? '')
      }, 1800)
    }
  }

  if (!open) return null

  // Top signals (max 4, sorted by document count descending)
  const topSignals = [...signals]
    .sort((a, b) => b.document_count - a.document_count)
    .slice(0, 4)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={handleDismiss}
        aria-hidden
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg rounded-xl border bg-background shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b">
            <div className="flex items-center gap-2.5">
              <div className="rounded-full bg-primary/10 p-1.5">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Create your first draft</p>
                <p className="text-xs text-muted-foreground">
                  {step === 'pick-signal'  && 'Step 1 of 2 — pick a signal to write about'}
                  {step === 'pick-format'  && `Step 2 of 2 — choose a content format`}
                  {step === 'generating'  && 'Generating your draft…'}
                  {step === 'done'        && 'Draft ready!'}
                </p>
              </div>
            </div>
            {step !== 'generating' && step !== 'done' && (
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-5">

            {/* Step 1 — pick signal */}
            {step === 'pick-signal' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  These are your strongest signals — topics your customers mention most across meetings and articles.
                </p>
                <div className="space-y-2">
                  {topSignals.map((signal) => {
                    const Icon = SIGNAL_ICONS[signal.signal_type]
                    return (
                      <button
                        key={signal.id}
                        onClick={() => handlePickSignal(signal)}
                        className="w-full text-left rounded-lg border px-4 py-3 hover:bg-muted/40 hover:border-primary/40 transition-colors group space-y-1"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">
                              {signal.title}
                            </p>
                          </div>
                          <ArrowRight className="size-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-center gap-2 pl-6">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${SIGNAL_CHIP[signal.signal_type]}`}>
                            {SIGNAL_LABEL[signal.signal_type]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {signal.document_count} doc{signal.document_count !== 1 ? 's' : ''} · {signal.source_count} source{signal.source_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 2 — pick format */}
            {step === 'pick-format' && selectedSignal && (
              <div className="space-y-4">
                {/* Selected signal recap */}
                <div className="rounded-lg bg-muted/40 border px-3 py-2.5 flex items-start gap-2">
                  {(() => {
                    const Icon = SIGNAL_ICONS[selectedSignal.signal_type]
                    return <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  })()}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Writing about</p>
                    <p className="text-sm font-medium leading-snug truncate">{selectedSignal.title}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedSignal(null); setSelectedFormat(null); setStep('pick-signal') }}
                    className="shrink-0 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Change
                  </button>
                </div>

                {/* Format grid */}
                <div className="grid grid-cols-2 gap-2">
                  {FORMATS.map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setSelectedFormat(fmt.value)}
                      className={[
                        'rounded-lg border px-3 py-3 text-left space-y-0.5 transition-colors hover:border-primary/50',
                        selectedFormat === fmt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/30',
                      ].join(' ')}
                    >
                      <p className="text-sm">{fmt.emoji} {fmt.label}</p>
                      <p className="text-xs text-muted-foreground">{fmt.description}</p>
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="text-xs text-destructive rounded bg-destructive/10 px-3 py-2">{error}</p>
                )}
              </div>
            )}

            {/* Step 3 — generating */}
            {step === 'generating' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="rounded-full bg-primary/10 p-4">
                  <Loader2 className="size-8 text-primary animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Writing your draft…</p>
                  <p className="text-xs text-muted-foreground">
                    Claude is generating content based on your signal. This takes 20–40 seconds.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4 — done */}
            {step === 'done' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Your draft is ready</p>
                  <p className="text-xs text-muted-foreground">Opening the Drafts tab…</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {(step === 'pick-format') && (
            <div className="px-6 pb-5 flex items-center justify-between gap-3">
              <button
                onClick={handleDismiss}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Skip for now
              </button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!selectedFormat}
                className="gap-1.5"
              >
                <Sparkles className="size-3.5" />
                Generate draft
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
