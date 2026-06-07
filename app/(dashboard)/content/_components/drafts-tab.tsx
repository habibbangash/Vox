'use client'
import { useState, useEffect, useMemo } from 'react'
import { Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type ContentDraft } from '@/app/actions/content'
import { type Persona } from '@/app/actions/personas'
import { DraftEditor } from './draft-editor'
import { NewDraftPanel } from './new-draft-panel'

const STATUS_OPTIONS = ['all', 'brief', 'draft', 'review', 'published'] as const
const FORMAT_OPTIONS = [
  { value: 'all',             label: 'All formats'   },
  { value: 'linkedin_post',   label: 'LinkedIn'      },
  { value: 'newsletter',      label: 'Newsletter'    },
  { value: 'blog_post',       label: 'Blog'          },
  { value: 'email_sequence',  label: 'Cold email'    },
  { value: 'marketing_email', label: 'Mktg email'    },
  { value: 'linkedin_ad',     label: 'LinkedIn ad'   },
  { value: 'battle_card',     label: 'Battle card'   },
] as const

type StatusFilter = typeof STATUS_OPTIONS[number]
type FormatFilter = typeof FORMAT_OPTIONS[number]['value']

interface DraftsTabProps {
  drafts:                   ContentDraft[]
  personas?:                Persona[]
  pendingFormat?:           string | null
  onPendingFormatConsumed?: () => void
  highlightDraftId?:        string | null
}

export function DraftsTab({ drafts, personas = [], pendingFormat, onPendingFormatConsumed, highlightDraftId }: DraftsTabProps) {
  const [showNew,        setShowNew]        = useState(false)
  const [newFormat,      setNewFormat]      = useState('linkedin_post')
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all')
  const [formatFilter,   setFormatFilter]   = useState<FormatFilter>('all')

  useEffect(() => {
    if (pendingFormat) {
      setNewFormat(pendingFormat)
      setShowNew(true)
      onPendingFormatConsumed?.()
    }
  }, [pendingFormat, onPendingFormatConsumed])

  const filtered = useMemo(() => drafts.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (formatFilter !== 'all' && d.format !== formatFilter) return false
    return true
  }), [drafts, statusFilter, formatFilter])

  const isFiltered = statusFilter !== 'all' || formatFilter !== 'all'

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {drafts.length === 0
            ? 'No drafts yet'
            : isFiltered
              ? `${filtered.length} of ${drafts.length} draft${drafts.length !== 1 ? 's' : ''}`
              : `${drafts.length} draft${drafts.length !== 1 ? 's' : ''}`}
        </p>
        {!showNew && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setNewFormat('linkedin_post'); setShowNew(true) }}
          >
            <Plus className="size-3.5 mr-1.5" />
            New draft
          </Button>
        )}
      </div>

      {/* Filter pills — only shown when there are drafts */}
      {drafts.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {/* Status */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'all' ? 'All statuses' : s}
              </button>
            ))}
          </div>
          {/* Format */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormatFilter(f.value)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  formatFilter === f.value
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New draft panel */}
      {showNew && (
        <NewDraftPanel
          format={newFormat}
          onClose={() => setShowNew(false)}
        />
      )}

      {/* Drafts list */}
      {drafts.length > 0 ? (
        filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((draft) => (
              <DraftEditor
                key={draft.id}
                draft={draft}
                personas={personas}
                initialSources={[]}
                defaultExpanded={draft.id === highlightDraftId}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed py-10 text-center space-y-1">
            <p className="text-sm font-medium">No drafts match these filters</p>
            <button
              onClick={() => { setStatusFilter('all'); setFormatFilter('all') }}
              className="text-xs text-primary underline underline-offset-2 hover:opacity-80"
            >
              Clear filters
            </button>
          </div>
        )
      ) : !showNew ? (
        <div className="rounded-lg border border-dashed py-14 text-center space-y-3">
          <FileText className="size-8 mx-auto text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No drafts yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Create one from a signal (AI-generated from your data) or start with a blank draft.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <a href="?tab=signals" className="text-xs text-primary underline underline-offset-2 hover:opacity-80">
              → Generate from a signal
            </a>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setNewFormat('linkedin_post'); setShowNew(true) }}
            >
              <Plus className="size-3.5 mr-1.5" />
              Start with a blank draft
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
