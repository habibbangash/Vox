'use client'
import { useEffect, useState, useTransition } from 'react'
import { X, ExternalLink, Mic, Rss, Search, Loader2 } from 'lucide-react'
import { getDocument, type DocumentDetail } from '@/app/actions/intelligence'

const SOURCE_CONFIG: Record<string, { label: string; style: string }> = {
  krisp:   { label: 'Meeting',  style: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  rss:     { label: 'Article',  style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'      },
  granola: { label: 'Note',     style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'   },
  slack:   { label: 'Slack',    style: 'bg-green-500/10 text-green-600 dark:text-green-400'   },
  gmail:   { label: 'Gmail',    style: 'bg-red-500/10 text-red-600 dark:text-red-400'         },
  hubspot: { label: 'HubSpot',  style: 'bg-orange-500/10 text-orange-600 dark:text-orange-400'},
  manual:  { label: 'Manual',   style: 'bg-muted text-muted-foreground'                       },
}

function SourceBadge({ type }: { type: string }) {
  const cfg = SOURCE_CONFIG[type] ?? { label: type, style: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.style}`}>
      {cfg.label}
    </span>
  )
}

interface DocumentDrawerProps {
  documentId: string | null
  onClose: () => void
}

export function DocumentDrawer({ documentId, onClose }: DocumentDrawerProps) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const open = documentId !== null

  useEffect(() => {
    if (!documentId) { setDoc(null); setFetchError(null); return }
    startTransition(async () => {
      const res = await getDocument(documentId)
      if (res.error) setFetchError(res.error)
      else setDoc(res.document)
    })
  }, [documentId])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-background shadow-xl transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div className="min-w-0 space-y-1">
            {isPending ? (
              <div className="h-5 w-48 rounded bg-muted animate-pulse" />
            ) : (
              <p className="text-sm font-semibold leading-snug line-clamp-2">{doc?.title ?? '—'}</p>
            )}
            {doc && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <SourceBadge type={doc.source_type} />
                {doc.author_name && <span>{doc.author_name}</span>}
                <span>
                  {new Date(doc.ingested_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-80"
                  >
                    View source <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`h-3 rounded bg-muted animate-pulse ${i % 4 === 3 ? 'w-2/3' : 'w-full'}`} />
              ))}
            </div>
          ) : fetchError ? (
            <p className="text-sm text-destructive">{fetchError}</p>
          ) : doc ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{doc.content}</p>
          ) : null}
        </div>
      </div>
    </>
  )
}
