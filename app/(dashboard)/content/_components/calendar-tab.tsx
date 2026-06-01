'use client'
import { ExternalLink } from 'lucide-react'
import { type ContentDraft } from '@/app/actions/content'

const FORMAT_LABELS: Record<string, string> = {
  linkedin_post:  'LinkedIn',
  email_sequence: 'Email',
  blog_post:      'Blog',
  battle_card:    'Battle card',
}
const STATUS_STYLE: Record<string, string> = {
  published: 'bg-green-500/10 text-green-600',
  review:    'bg-amber-500/10 text-amber-600',
  draft:     'bg-blue-500/10 text-blue-600',
  brief:     'bg-muted text-muted-foreground',
}

function monthKey(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

interface CalendarTabProps {
  drafts: ContentDraft[]
}

export function CalendarTab({ drafts }: CalendarTabProps) {
  // Show published + review drafts, sorted by relevant date descending
  const relevant = drafts
    .filter((d) => d.status === 'published' || d.status === 'review' || d.status === 'draft')
    .map((d) => ({ ...d, sortDate: d.published_at ?? d.updated_at }))
    .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())

  if (relevant.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-14 text-center space-y-1">
        <p className="text-sm font-medium">No content yet</p>
        <p className="text-xs text-muted-foreground">
          Drafts in review or published state will appear here grouped by month.
        </p>
      </div>
    )
  }

  // Group by month
  const groups: { month: string; items: typeof relevant }[] = []
  for (const item of relevant) {
    const month = monthKey(item.sortDate)
    const existing = groups.find((g) => g.month === month)
    if (existing) {
      existing.items.push(item)
    } else {
      groups.push({ month, items: [item] })
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground">
        {relevant.length} piece{relevant.length !== 1 ? 's' : ''} across {groups.length} month{groups.length !== 1 ? 's' : ''}
      </p>

      {groups.map(({ month, items }) => (
        <section key={month} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {month}
          </h3>
          <div className="space-y-1.5">
            {items.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5"
              >
                <span className="text-xs text-muted-foreground w-6 shrink-0 tabular-nums">
                  {new Date(draft.sortDate).getDate()}
                </span>
                <p className="flex-1 text-sm font-medium truncate min-w-0">{draft.title}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {FORMAT_LABELS[draft.format] ?? draft.format}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[draft.status] ?? ''}`}>
                    {draft.status}
                  </span>
                  {draft.published_url && (
                    <a
                      href={draft.published_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
