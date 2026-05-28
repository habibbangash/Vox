'use client'
import { useActionState, useTransition, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { connectRSS, syncRSSFeed, disconnectSource } from '@/app/actions/sources'
import { relativeTime } from '@/lib/utils'

interface RSSConnection {
  id: string
  display_name: string | null
  status: string
  config: { url?: string }
  last_synced_at: string | null
  synced_count: number
  error_message: string | null
}

interface RssSectionProps {
  connections: RSSConnection[]
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400',
  syncing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

export function RssSection({ connections }: RssSectionProps) {
  const [addState, addAction, addPending] = useActionState(connectRSS, undefined)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (addState?.success) formRef.current?.reset()
  }, [addState])

  function handleSync(connectionId: string) {
    startTransition(async () => {
      await syncRSSFeed(connectionId)
    })
  }

  function handleRemove(connectionId: string) {
    startTransition(async () => {
      await disconnectSource(connectionId)
    })
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-base">📡</span>
          <CardTitle>RSS Feeds</CardTitle>
          {connections.length === 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Start here
            </span>
          )}
          {connections.length > 0 && (
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {connections.length} feed{connections.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <CardDescription>
          Pull articles and updates from any RSS or Atom feed into your workspace.
          {connections.length === 0 && (
            <span className="block mt-1 text-xs text-muted-foreground/70">⏱ 2 min to set up · Paste any RSS or Atom URL below</span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add feed form */}
        <form ref={formRef} action={addAction} className="flex gap-2">
          <Input
            name="url"
            placeholder="https://example.com/feed.xml"
            className="h-7 text-xs"
            disabled={addPending}
            required
          />
          <Button size="sm" type="submit" disabled={addPending}>
            {addPending ? 'Adding…' : 'Add'}
          </Button>
        </form>

        {addState?.error && (
          <p className="text-xs text-destructive">{addState.error}</p>
        )}
        {addState?.success && (
          <p className="text-xs text-green-600 dark:text-green-400">
            Feed added — {addState.synced ?? 0} article{addState.synced !== 1 ? 's' : ''} ingested. Signals will be computed on the next hourly sync.
          </p>
        )}

        {/* Feed list */}
        {connections.length > 0 && (
          <div className="space-y-2">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{conn.display_name ?? conn.config.url}</p>
                    <p className="text-xs text-muted-foreground truncate">{conn.config.url}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[conn.status] ?? STATUS_STYLES.active}`}>
                    {conn.status}
                  </span>
                </div>

                {conn.error_message && (
                  <p className="text-xs text-destructive">{conn.error_message}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground">{conn.synced_count}</span> articles
                    </span>
                    {conn.last_synced_at && (
                      <span>
                        Synced{' '}
                        <span className="font-medium text-foreground">
                          {relativeTime(conn.last_synced_at)}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(conn.id)}
                      disabled={isPending || conn.status === 'syncing'}
                    >
                      {conn.status === 'syncing' ? 'Syncing…' : 'Sync'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(conn.id)}
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
