import Link from 'next/link'
import { Fragment } from 'react'
import { Plug, Layers, TrendingUp, FileText, Send, ChevronRight, ChevronDown, CheckCircle2 } from 'lucide-react'

interface WorkflowDiagramProps {
  sourceCount: number
  docCount:    number
  signalCount: number
  draftCount:  number
}

const STEPS = [
  {
    key:         'sources',
    label:       'Connect',
    sublabel:    'sources',
    icon:        Plug,
    href:        '/sources',
    countKey:    'sourceCount' as const,
    unit:        'source',
  },
  {
    key:         'docs',
    label:       'Ingest',
    sublabel:    'documents',
    icon:        Layers,
    href:        '/intelligence',
    countKey:    'docCount' as const,
    unit:        'document',
  },
  {
    key:         'signals',
    label:       'Signals',
    sublabel:    'detected',
    icon:        TrendingUp,
    href:        '/content',
    countKey:    'signalCount' as const,
    unit:        'signal',
  },
  {
    key:         'drafts',
    label:       'Draft',
    sublabel:    'created',
    icon:        FileText,
    href:        '/content',
    countKey:    'draftCount' as const,
    unit:        'draft',
  },
  {
    key:         'publish',
    label:       'Publish',
    sublabel:    'and share',
    icon:        Send,
    href:        '/content',
    countKey:    null,
    unit:        '',
  },
]

export function WorkflowDiagram({
  sourceCount,
  docCount,
  signalCount,
  draftCount,
}: WorkflowDiagramProps) {
  const counts: Record<string, number> = { sourceCount, docCount, signalCount, draftCount }

  const stepDone = STEPS.map((s) =>
    s.countKey ? (counts[s.countKey] ?? 0) > 0 : draftCount > 0
  )

  const activeIdx = stepDone.findIndex((d) => !d)

  return (
    <section className="rounded-lg border bg-card p-5 space-y-3">
      <div>
        <p className="text-sm font-medium">How Vox works</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your progress through the pipeline — click any step to navigate.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-stretch">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const isDone   = stepDone[i]
          const isActive = i === activeIdx
          const count    = step.countKey ? (counts[step.countKey] ?? 0) : null

          return (
            <Fragment key={step.key}>
              {/* Step card */}
              <Link
                href={step.href}
                className={[
                  'flex sm:flex-col items-center gap-3 sm:gap-2 sm:justify-center',
                  'rounded-lg border px-3 py-3 sm:px-3 sm:py-4 sm:text-center',
                  'flex-1 transition-colors hover:bg-muted/40 min-w-0',
                  isDone
                    ? 'border-green-500/30 bg-green-500/5'
                    : isActive
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-muted/20 opacity-60',
                ].join(' ')}
              >
                {/* Icon */}
                <div className={[
                  'shrink-0 rounded-full p-1.5',
                  isDone
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                ].join(' ')}>
                  {isDone
                    ? <CheckCircle2 className="size-3.5" />
                    : <Icon className="size-3.5" />}
                </div>

                {/* Text */}
                <div className="min-w-0 sm:space-y-0.5">
                  <p className={[
                    'text-xs font-semibold leading-none',
                    isDone ? 'text-green-700 dark:text-green-400' : isActive ? 'text-foreground' : 'text-muted-foreground',
                  ].join(' ')}>
                    {step.label}
                  </p>

                  {count !== null && count > 0 ? (
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                      {count.toLocaleString()} {step.unit}{count !== 1 ? 's' : ''}
                    </p>
                  ) : isActive ? (
                    <p className="text-xs text-primary mt-0.5 hidden sm:block">← up next</p>
                  ) : !isDone ? (
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{step.sublabel}</p>
                  ) : null}
                </div>
              </Link>

              {/* Arrow connector */}
              {i < STEPS.length - 1 && (
                <div className="flex items-center justify-center sm:px-1 py-1 sm:py-0 shrink-0">
                  <ChevronDown className="size-3.5 text-muted-foreground/30 sm:hidden" />
                  <ChevronRight className="size-3.5 text-muted-foreground/30 hidden sm:block" />
                </div>
              )}
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}
