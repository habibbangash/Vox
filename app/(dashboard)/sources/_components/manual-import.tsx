'use client'
import { useState, useTransition } from 'react'
import { Check, Loader2, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { importManualContent } from '@/app/actions/sources'

export function ManualImport() {
  const [open,    setOpen]    = useState(false)
  const [title,   setTitle]   = useState('')
  const [content, setContent] = useState('')
  const [author,  setAuthor]  = useState('')
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await importManualContent({
        title: title.trim(),
        content: content.trim(),
        author_name: author.trim() || null,
      })
      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTitle('')
        setContent('')
        setAuthor('')
        setTimeout(() => { setSaved(false); setOpen(false) }, 2000)
      }
    })
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Manual import</CardTitle>
            <CardDescription>
              Paste meeting notes, articles, or any text content directly.
            </CardDescription>
          </div>
          {!open && (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Plus className="size-3.5 mr-1.5" />
              Paste content
            </Button>
          )}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          {saved && (
            <p className="text-xs text-green-600 flex items-center gap-1.5 rounded bg-green-500/10 px-2 py-1.5">
              <Check className="size-3.5 shrink-0" /> Content imported and queued for processing.
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Customer call — Acme Inc. 28 May"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Author / source (optional)</Label>
            <Input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. John Smith, or leave blank"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your meeting notes, article, or any text here…"
              className="min-h-32 text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground">{content.length.toLocaleString()} characters</p>
          </div>

          {error && (
            <p className="text-xs text-destructive rounded bg-destructive/10 px-2 py-1">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setOpen(false); setError(null) }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isPending || !title.trim() || !content.trim()}
            >
              {isPending ? <><Loader2 className="size-3.5 animate-spin mr-1.5" /> Saving…</> : 'Import'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
