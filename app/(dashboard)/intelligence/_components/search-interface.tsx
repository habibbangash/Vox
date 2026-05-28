'use client'
import { useState, useEffect, useTransition, useCallback } from 'react'
import { Search, Mic, Rss, Clock, Loader2, Sparkles, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { searchDocuments, type DocumentResult, type RecentResult } from '@/app/actions/intelligence'
import { DocumentDrawer } from './document-drawer'

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; style: string }> = {
  krisp:   { label: 'Meeting', icon: <Mic className="size-3" />, style: 'bg-violet-500/10 text-violet-600 dark:text-violet-400'  },
  rss:     { label: 'Article', icon: <Rss className="size-3" />, style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'        },
  granola: { label: 'Note',    icon: <Mic className="size-3" />, style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'     },
  slack:   { label: 'Slack',   icon: <Search className="size-3" />, style: 'bg-green-500/10 text-green-600 dark:text-green-400'  },
  gmail:   { label: 'Gmail',   icon: <Search className="size-3" />, style: 'bg-red-500/10 text-red-600 dark:text-red-400'        },
  hubspot: { label: 'HubSpot', icon: <Search className="size-3" />, style: 'bg-orange-500/10 text-orange-600 dark:text-orange-400'},
}

function SourceBadge({ type }: { type: string }) {
  const cfg = SOURCE_CONFIG[type] ?? { label: type, icon: null, style: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.style}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function DocumentCard({ doc, showSimilarity, onClick }: { doc: DocumentResult; showSimilarity?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-card px-4 py-3 space-y-1.5 hover:bg-muted/30 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug line-clamp-1">{doc.title}</p>
        <div className="flex shrink-0 items-center gap-2">
          {showSimilarity && doc.similarity !== undefined && (
            <span className="text-xs text-muted-foreground">{doc.similarity}% match</span>
          )}
          <SourceBadge type={doc.source_type} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{doc.snippet}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {doc.author_name && <span>{doc.author_name}</span>}
        {doc.author_name && <span>·</span>}
        <span>{new Date(doc.ingested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 space-y-2 animate-pulse">
      <div className="flex justify-between gap-3">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-4 w-16 rounded-full bg-muted" />
      </div>
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-4/5 rounded bg-muted" />
    </div>
  )
}

interface SearchInterfaceProps {
  initial: RecentResult
}

export function SearchInterface({ initial }: SearchInterfaceProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DocumentResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [activeSource, setActiveSource] = useState<string | null>(null)
  const closeDrawer = useCallback(() => setSelectedDocId(null), [])

  const availableSources = [...new Set(initial.documents.map(d => d.source_type))]
  const filteredDocs = activeSource
    ? initial.documents.filter(d => d.source_type === activeSource)
    : initial.documents

  // Debounced search — fires 400ms after the user stops typing
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([])
      setHasSearched(false)
      setSearchError(null)
      return
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        setSearchError(null)
        const res = await searchDocuments(query)
        setResults(res.results)
        setHasSearched(true)
        if (res.error) setSearchError(res.error)
      })
    }, 400)

    return () => clearTimeout(timer)
  }, [query])

  const showingSearch = query.trim().length >= 3
  const hasResults = results.length > 0
  const hasRecentDocs = initial.documents.length > 0

  return (
    <div className="space-y-6">
      {/* Stats */}
      {initial.total > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span><span className="font-medium text-foreground">{initial.total}</span> documents indexed</span>
          {initial.unprocessed > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                {initial.unprocessed} being embedded
              </span>
            </>
          )}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across meetings and articles…"
          className="pl-9 h-10"
        />
        {isPending ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        ) : query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Error */}
      {searchError && (
        <p className="text-xs text-destructive">{searchError}</p>
      )}

      {/* Search results */}
      {showingSearch && (
        <div className="space-y-3">
          {isPending ? (
            <>
              <p className="text-xs text-muted-foreground">Searching…</p>
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </>
          ) : hasResults ? (
            <>
              <p className="text-xs text-muted-foreground">
                {results.length} result{results.length !== 1 ? 's' : ''} for <span className="italic">"{query}"</span>
              </p>
              {results.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} showSimilarity onClick={() => setSelectedDocId(doc.id)} />
              ))}

              {/* RAG placeholder */}
              <div className="rounded-lg border border-dashed p-4 space-y-1 mt-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5" />
                  AI answer
                </div>
                <p className="text-xs text-muted-foreground">
                  Summaries and answers will appear here once the extraction pipeline is live.
                </p>
              </div>
            </>
          ) : hasSearched ? (
            <div className="py-8 text-center text-sm text-muted-foreground space-y-1">
              <p>No matches found for <span className="italic">"{query}"</span></p>
              <p className="text-xs">Try broader terms, or add more sources on the Sources page.</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Recent documents feed (shown when no query) */}
      {!showingSearch && (
        <div className="space-y-3">
          {hasRecentDocs ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mr-1">
                  <Clock className="size-3.5" />
                  Recent
                </div>
                {availableSources.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveSource(null)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${activeSource === null ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    >
                      All
                    </button>
                    {availableSources.map(src => {
                      const cfg = SOURCE_CONFIG[src] ?? { label: src, style: 'bg-muted text-muted-foreground' }
                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setActiveSource(activeSource === src ? null : src)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${activeSource === src ? cfg.style + ' ring-1 ring-inset ring-current/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                        >
                          {cfg.label}
                        </button>
                      )
                    })}
                  </>
                )}
              </div>
              {filteredDocs.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} onClick={() => setSelectedDocId(doc.id)} />
              ))}
            </>
          ) : (
            <div className="rounded-lg border border-dashed px-6 py-12 space-y-5">
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">No documents yet</p>
                <p className="text-xs text-muted-foreground">Follow these steps to start building your intelligence layer.</p>
              </div>
              <ol className="space-y-3 max-w-sm mx-auto">
                {[
                  { step: '1', text: 'Connect a source', href: '/sources', cta: 'Go to Sources' },
                  { step: '2', text: 'Content syncs automatically every hour (or trigger a manual sync from Sources)' },
                  { step: '3', text: 'Return here to search, explore documents, and generate content from signals' },
                ].map(({ step, text, href, cta }) => (
                  <li key={step} className="flex items-start gap-3 text-xs text-muted-foreground">
                    <span className="shrink-0 size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-foreground">{step}</span>
                    <span className="pt-0.5">
                      {text}{' '}
                      {href && <a href={href} className="text-primary underline underline-offset-2 hover:opacity-80">{cta}</a>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <DocumentDrawer documentId={selectedDocId} onClose={closeDrawer} />
    </div>
  )
}
