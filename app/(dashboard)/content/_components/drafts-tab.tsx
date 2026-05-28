'use client'
import { useState, useEffect } from 'react'
import { Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type ContentDraft } from '@/app/actions/content'
import { DraftEditor } from './draft-editor'
import { NewDraftPanel } from './new-draft-panel'

interface DraftsTabProps {
  drafts:                    ContentDraft[]
  pendingFormat?:            string | null
  onPendingFormatConsumed?:  () => void
  highlightDraftId?:         string | null
  linkedInConnected?:        boolean
  emailConfigured?:          boolean
}

export function DraftsTab({ drafts, pendingFormat, onPendingFormatConsumed, highlightDraftId, linkedInConnected = false, emailConfigured = false }: DraftsTabProps) {
  const [showNew,   setShowNew]   = useState(false)
  const [newFormat, setNewFormat] = useState('linkedin_post')

  // When a template is selected from the Templates tab, open the new-draft panel
  useEffect(() => {
    if (pendingFormat) {
      setNewFormat(pendingFormat)
      setShowNew(true)
      onPendingFormatConsumed?.()
    }
  }, [pendingFormat, onPendingFormatConsumed])

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {drafts.length === 0 ? 'No drafts yet' : `${drafts.length} draft${drafts.length !== 1 ? 's' : ''}`}
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

      {/* New draft panel */}
      {showNew && (
        <NewDraftPanel
          format={newFormat}
          onClose={() => setShowNew(false)}
        />
      )}

      {/* Drafts list */}
      {drafts.length > 0 ? (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <DraftEditor
              key={draft.id}
              draft={draft}
              initialSources={[]}
              defaultExpanded={draft.id === highlightDraftId}
              linkedInConnected={linkedInConnected}
              emailConfigured={emailConfigured}
            />
          ))}
        </div>
      ) : !showNew ? (
        <div className="rounded-lg border border-dashed py-14 text-center space-y-3">
          <FileText className="size-8 mx-auto text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No drafts yet</p>
            <p className="text-xs text-muted-foreground">
              Start from a template or create a blank draft above.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setNewFormat('linkedin_post'); setShowNew(true) }}
          >
            <Plus className="size-3.5 mr-1.5" />
            New LinkedIn post
          </Button>
        </div>
      ) : null}
    </div>
  )
}
