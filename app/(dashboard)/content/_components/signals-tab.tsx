'use client'
import { Sparkles, TrendingUp } from 'lucide-react'

const STUB_SIGNALS = [
  {
    id: '1',
    topic: 'AI in sales workflows',
    description: 'Multiple recent meeting transcripts mention prospect interest in automating SDR tasks.',
    source_count: 3,
  },
  {
    id: '2',
    topic: 'Integration complexity objection',
    description: 'Recurring objection across 2 deals — prospects asking about API overhead and setup time.',
    source_count: 2,
  },
  {
    id: '3',
    topic: 'Competitor pricing comparison',
    description: 'Articles in your RSS feeds this week are covering market pricing shifts.',
    source_count: 4,
  },
]

export function SignalsTab() {
  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-start gap-3">
        <Sparkles className="size-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">What are signals?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Signals detect content opportunities by clustering similar topics across your meetings and articles.
            When 3+ sources mention the same theme, Vox surfaces it as a ready-to-draft opportunity.
            Signals activate once the extraction pipeline is live.
          </p>
        </div>
      </div>

      {/* Stub signal cards */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <TrendingUp className="size-3.5" />
          Preview — signals will look like this
        </div>
        {STUB_SIGNALS.map((signal) => (
          <div
            key={signal.id}
            className="rounded-lg border bg-card px-4 py-3 space-y-1.5 opacity-60 select-none"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{signal.topic}</p>
              <span className="shrink-0 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {signal.source_count} sources
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{signal.description}</p>
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="size-3" />
                Draft LinkedIn post · Draft email
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon note */}
      <div className="rounded-lg border border-dashed p-4 text-center space-y-1">
        <p className="text-sm font-medium">Signals are coming soon</p>
        <p className="text-xs text-muted-foreground">
          Add an <code className="bg-muted rounded px-1 py-0.5">ANTHROPIC_API_KEY</code> to unlock entity extraction,
          then signals will auto-detect from your ingested content.
        </p>
      </div>
    </div>
  )
}
