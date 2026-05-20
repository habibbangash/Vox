'use client'
import { useState, useTransition, useActionState } from 'react'
import { Search, Plus, X, Check, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { searchDocuments, type DocumentResult } from '@/app/actions/intelligence'
import { createDraft, type ContentActionState } from '@/app/actions/content'

const SOURCE_STYLE: Record<string, { label: string; style: string }> = {
  krisp:   { label: 'Meeting', style: 'bg-violet-500/10 text-violet-600' },
  rss:     { label: 'Article', style: 'bg-blue-500/10 text-blue-600' },
  granola: { label: 'Note',    style: 'bg-amber-500/10 text-amber-600' },
}

function SourceBadge({ type }: { type: string }) {
  const cfg = SOURCE_STYLE[type] ?? { label: type, style: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.style}`}>
      {cfg.label}
    </span>
  )
}

interface NewDraftPanelProps {
  onClose: () => void
  format?: string
}

export function NewDraftPanel({ onClose, format = 'linkedin_post' }: NewDraftPanelProps) {
  const [evidenceQuery, setEvidenceQuery] = useState('')
  const [evidenceResults, setEvidenceResults] = useState<DocumentResult[]>([])
  const [selectedDocs, setSelectedDocs] = useState<DocumentResult[]>([])
  const [isSearching, startSearch] = useTransition()
  const [hasSearched, setHasSearched] = useState(false)

  const [state, formAction, isPending] = useActionState<ContentActionState, FormData>(
    createDraft,
    undefined
  )

  const FORMAT_LABELS: Record<string, string> = {
    linkedin_post:   'LinkedIn Post',
    email_sequence:  'Email Sequence',
    blog_post:       'Blog Post',
    battle_card:     'Battle Card',
  }

  function handleSearch() {
    if (evidenceQuery.trim().length < 3) return
    startSearch(async () => {
      const res = await searchDocuments(evidenceQuery.trim())
      setEvidenceResults(res.results)
      setHasSearched(true)
    })
  }

  function toggleDoc(doc: DocumentResult) {
    setSelectedDocs((prev) =>
      prev.some((d) => d.id === doc.id)
        ? prev.filter((d) => d.id !== doc.id)
        : [...prev, doc]
    )
  }

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">New {FORMAT_LABELS[format] ?? 'Draft'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Give it a title, find your evidence, then save the brief.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="format" value={format} />

        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs">Title</Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g. Why AI-first sales teams close faster"
            className="h-9 text-sm"
            required
          />
        </div>

        {/* Topic */}
        <div className="space-y-1.5">
          <Label htmlFor="topic" className="text-xs">Topic / angle</Label>
          <Input
            id="topic"
            name="topic"
            placeholder="e.g. AI in sales workflows"
            className="h-9 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Used to search your knowledge base for evidence.
          </p>
        </div>

        {/* Evidence search */}
        <div className="space-y-2">
          <Label className="text-xs">Evidence from your knowledge base</Label>
          <div className="flex gap-2">
            <Input
              value={evidenceQuery}
              onChange={(e) => setEvidenceQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              placeholder="Search meetings and articles…"
              className="h-9 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={isSearching || evidenceQuery.trim().length < 3}
              className="shrink-0"
            >
              {isSearching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
            </Button>
          </div>

          {/* Results */}
          {evidenceResults.length > 0 && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {evidenceResults.map((doc) => {
                const selected = selectedDocs.some((d) => d.id === doc.id)
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => toggleDoc(doc)}
                    className={`w-full text-left rounded-md border px-3 py-2 space-y-0.5 transition-colors ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium line-clamp-1">{doc.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {doc.similarity !== undefined && (
                          <span className="text-xs text-muted-foreground">{doc.similarity}%</span>
                        )}
                        <SourceBadge type={doc.source_type} />
                        {selected && <Check className="size-3 text-primary" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{doc.snippet}</p>
                  </button>
                )
              })}
            </div>
          )}

          {hasSearched && evidenceResults.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 text-center">
              No matches. Try different keywords or add more sources.
            </p>
          )}

          {/* Selected chips */}
          {selectedDocs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedDocs.map((doc) => (
                <span
                  key={doc.id}
                  className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs"
                >
                  {doc.title.length > 28 ? doc.title.slice(0, 28) + '…' : doc.title}
                  <button
                    type="button"
                    onClick={() => toggleDoc(doc)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Hidden field to pass selected doc IDs */}
          <input
            type="hidden"
            name="source_document_ids"
            value={selectedDocs.map((d) => d.id).join(',')}
          />
        </div>

        {/* Error */}
        {state?.error && (
          <p className="text-xs text-destructive">{state.error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Plus className="size-3.5 mr-1.5" />}
            Save brief
          </Button>
        </div>
      </form>
    </div>
  )
}
