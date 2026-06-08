'use client'
import { ExternalLink, Send } from 'lucide-react'
import { type ContentDraft } from '@/app/actions/content'

const FORMAT_LABELS: Record<string, string> = {
  linkedin_post:   'LinkedIn Post',
  email_sequence:  'Cold Email',
  blog_post:       'Blog Post',
  battle_card:     'Battle Card',
  newsletter:      'Newsletter',
  marketing_email: 'Marketing Email',
  linkedin_ad:     'LinkedIn Ad',
}

interface PublishedTabProps {
  drafts: ContentDraft[]
}

export function PublishedTab({ drafts }: PublishedTabProps) {
  const published = drafts
    .filter((d) => d.status === 'published')
    .sort((a, b) => {
      const dateA = a.published_at ?? a.updated_at
      const dateB = b.published_at ?? b.updated_at
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

  if (published.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-14 text-center space-y-2">
        <Send className="size-7 mx-auto text-muted-foreground/40" />
        <p className="text-sm font-medium">Nothing published yet</p>
        <p className="text-xs text-muted-foreground">
          Published LinkedIn posts and emails will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {published.length} published piece{published.length !== 1 ? 's' : ''}
      </p>

      <div className="space-y-2">
        {published.map((draft) => {
          const date = draft.published_at ?? draft.updated_at
          return (
            <div
              key={draft.id}
              className="rounded-lg border bg-card px-4 py-3 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium truncate">{draft.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{FORMAT_LABELS[draft.format] ?? draft.format}</span>
                  <span>·</span>
                  <span>
                    {new Date(date).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              {draft.published_url ? (
                <a
                  href={draft.published_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
                >
                  View <ExternalLink className="size-3" />
                </a>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">No URL</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
