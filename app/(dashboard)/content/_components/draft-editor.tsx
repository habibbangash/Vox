'use client'
import { useState, useTransition, useEffect } from 'react'
import { ChevronDown, ChevronUp, Trash2, Sparkles, Loader2, Search, X, Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { updateDraft, deleteDraft, addDraftSource, removeDraftSource, getDraftSources, type ContentDraft } from '@/app/actions/content'
import { searchDocuments, type DocumentResult } from '@/app/actions/intelligence'

const STATUS_OPTIONS = ['brief', 'draft', 'review', 'published'] as const
const STATUS_STYLE: Record<string, string> = {
  brief:     'bg-muted text-muted-foreground',
  draft:     'bg-blue-500/10 text-blue-600',
  review:    'bg-amber-500/10 text-amber-600',
  published: 'bg-green-500/10 text-green-600',
}
const FORMAT_LABELS: Record<string, string> = {
  linkedin_post:  'LinkedIn Post',
  email_sequence: 'Email Sequence',
  blog_post:      'Blog Post',
  battle_card:    'Battle Card',
}
const SOURCE_STYLE: Record<string, { label: string; style: string }> = {
  krisp:   { label: 'Meeting',  style: 'bg-violet-500/10 text-violet-600' },
  rss:     { label: 'Article',  style: 'bg-blue-500/10 text-blue-600' },
  granola: { label: 'Note',     style: 'bg-amber-500/10 text-amber-600' },
  slack:   { label: 'Slack',    style: 'bg-green-500/10 text-green-600' },
  gmail:   { label: 'Gmail',    style: 'bg-red-500/10 text-red-600' },
  hubspot: { label: 'HubSpot',  style: 'bg-orange-500/10 text-orange-600' },
}

function SourceBadge({ type }: { type: string }) {
  const cfg = SOURCE_STYLE[type] ?? { label: type, style: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.style}`}>
      {cfg.label}
    </span>
  )
}

interface LinkedSource {
  id: string
  document_id: string
  snippet: string | null
  source_documents: {
    id: string
    title: string
    source_type: string
    author_name: string | null
    ingested_at: string
  } | null
}

interface DraftEditorProps {
  draft: ContentDraft
  initialSources: LinkedSource[]
}

export function DraftEditor({ draft, initialSources }: DraftEditorProps) {
  const [expanded, setExpanded] = useState(false)
  const [title,    setTitle]    = useState(draft.title)
  const [body,     setBody]     = useState(draft.body ?? '')
  const [status,   setStatus]   = useState(draft.status)
  const [topic,    setTopic]    = useState(draft.brief?.topic ?? '')
  const [sources,  setSources]  = useState<LinkedSource[]>(initialSources)

  const [evidenceQuery,   setEvidenceQuery]   = useState('')
  const [evidenceResults, setEvidenceResults] = useState<DocumentResult[]>([])
  const [hasSearched,     setHasSearched]     = useState(false)
  const [sourcesLoaded,   setSourcesLoaded]   = useState(false)
  const [isSearching,     startSearch]        = useTransition()
  const [isSaving,        startSave]          = useTransition()
  const [isDeleting,      startDelete]        = useTransition()

  // Load persisted sources the first time the editor is expanded
  useEffect(() => {
    if (!expanded || sourcesLoaded) return
    getDraftSources(draft.id).then((rows) => {
      setSources(rows as unknown as LinkedSource[])
      setSourcesLoaded(true)
    })
  }, [expanded, sourcesLoaded, draft.id])

  const charCount = body.length
  const LINKEDIN_MAX = 3000

  function save() {
    startSave(async () => {
      await updateDraft(draft.id, {
        title,
        body: body || null,
        status,
        brief: { ...draft.brief, topic },
      })
    })
  }

  function handleDelete() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    startDelete(async () => {
      await deleteDraft(draft.id)
    })
  }

  function handleSearch() {
    if (evidenceQuery.trim().length < 3) return
    startSearch(async () => {
      const res = await searchDocuments(evidenceQuery.trim())
      setEvidenceResults(res.results)
      setHasSearched(true)
    })
  }

  async function handleAddSource(doc: DocumentResult) {
    if (sources.some((s) => s.document_id === doc.id)) return
    await addDraftSource(draft.id, doc.id, doc.snippet)
    setSources((prev) => [
      ...prev,
      {
        id: doc.id,
        document_id: doc.id,
        snippet: doc.snippet,
        source_documents: {
          id: doc.id,
          title: doc.title,
          source_type: doc.source_type,
          author_name: doc.author_name,
          ingested_at: doc.ingested_at,
        },
      },
    ])
  }

  async function handleRemoveSource(documentId: string) {
    await removeDraftSource(draft.id, documentId)
    setSources((prev) => prev.filter((s) => s.document_id !== documentId))
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[draft.status]}`}
          >
            {draft.status}
          </span>
          <span className="text-sm font-medium truncate">{draft.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground hidden sm:inline">
            {FORMAT_LABELS[draft.format]}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2 text-muted-foreground">
          <span className="text-xs hidden sm:inline">
            {new Date(draft.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-5">
          {/* Title + status */}
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5 shrink-0">
              <Label className="text-xs">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Brief */}
          <div className="space-y-1.5">
            <Label className="text-xs">Topic / angle</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. AI in sales workflows"
              className="h-9 text-sm"
            />
          </div>

          {/* Evidence */}
          <div className="space-y-2">
            <Label className="text-xs">Evidence</Label>

            {/* Linked sources */}
            {sources.length > 0 && (
              <div className="space-y-1.5">
                {sources.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium line-clamp-1">
                          {s.source_documents?.title ?? 'Unknown document'}
                        </p>
                        <SourceBadge type={s.source_documents?.source_type ?? ''} />
                      </div>
                      {s.snippet && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{s.snippet}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveSource(s.document_id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search to add more evidence */}
            <div className="flex gap-2">
              <Input
                value={evidenceQuery}
                onChange={(e) => setEvidenceQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                placeholder="Search for more evidence…"
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

            {evidenceResults.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {evidenceResults.map((doc) => {
                  const linked = sources.some((s) => s.document_id === doc.id)
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => !linked && handleAddSource(doc)}
                      disabled={linked}
                      className={`w-full text-left rounded-md border px-3 py-2 space-y-0.5 transition-colors ${
                        linked
                          ? 'border-primary/30 bg-primary/5 cursor-default'
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
                          {linked
                            ? <Check className="size-3 text-primary" />
                            : <Plus className="size-3 text-muted-foreground" />}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{doc.snippet}</p>
                    </button>
                  )
                })}
              </div>
            )}

            {hasSearched && evidenceResults.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No matches found.</p>
            )}
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Content</Label>
              {draft.format === 'linkedin_post' && (
                <span className={`text-xs ${charCount > LINKEDIN_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {charCount} / {LINKEDIN_MAX}
                </span>
              )}
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your content here…"
              className="min-h-36 text-sm resize-none"
            />
          </div>

          {/* Generation stub */}
          <div className="rounded-lg border border-dashed p-3 flex items-start gap-2.5">
            <Sparkles className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">AI generation</p>
              <p className="text-xs text-muted-foreground/80 mt-0.5">
                Will generate a {FORMAT_LABELS[draft.format]} from your brief and evidence once the extraction
                pipeline is live. Add an <code className="bg-muted rounded px-1">ANTHROPIC_API_KEY</code> to unlock.
              </p>
            </div>
          </div>

          {/* Save / delete */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              {isDeleting
                ? <Loader2 className="size-3.5 animate-spin" />
                : <Trash2 className="size-3.5" />}
              Delete
            </button>
            <Button size="sm" onClick={save} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
