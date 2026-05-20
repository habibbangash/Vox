'use client'
import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { syncGmail, updateGmailQuery, disconnectSource } from '@/app/actions/sources'

interface GmailConnection {
  id: string
  display_name: string | null
  status: string
  config: { query?: string }
  last_synced_at: string | null
  synced_count: number
  error_message?: string | null
}

interface GmailCardProps {
  connection: GmailConnection | null
}

export function GmailCard({ connection }: GmailCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState(connection?.config?.query ?? 'newer_than:90d')

  function handleConnect() {
    window.location.href = '/api/oauth/google'
  }

  function handleDisconnect() {
    if (!connection) return
    setError(null)
    startTransition(async () => {
      const result = await disconnectSource(connection.id)
      if (result?.error) setError(result.error)
    })
  }

  function handleSaveQuery() {
    if (!connection) return
    setError(null)
    startTransition(async () => {
      const result = await updateGmailQuery(connection.id, query)
      if (result?.error) setError(result.error)
    })
  }

  function handleSync() {
    if (!connection) return
    setError(null)
    startTransition(async () => {
      const result = await syncGmail(connection.id)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-base">✉</span>
          <CardTitle>Gmail</CardTitle>
          {connection && (
            <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              {connection.display_name}
            </span>
          )}
        </div>
        <CardDescription>
          Ingest sent and received email threads from Gmail. Surfaces cold outreach replies, prospect objections, and nurturing signals.
        </CardDescription>
        {!connection && (
          <CardAction>
            <Button size="sm" onClick={handleConnect}>
              Connect Gmail
            </Button>
          </CardAction>
        )}
      </CardHeader>

      {connection && (
        <>
          <CardContent className="space-y-4">
            {connection.error_message && (
              <p className="text-xs text-destructive">{connection.error_message}</p>
            )}

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Search query</p>
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-7 text-xs font-mono"
                  disabled={isPending}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveQuery}
                  disabled={isPending}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Uses Gmail search syntax, e.g. <code className="font-mono">newer_than:90d</code> or <code className="font-mono">label:prospects</code>.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{connection.synced_count}</span> threads ingested
                </span>
                {connection.last_synced_at && (
                  <span>
                    Last synced{' '}
                    <span className="font-medium text-foreground">
                      {new Date(connection.last_synced_at).toLocaleDateString()}
                    </span>
                  </span>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleSync}
                disabled={isPending || connection.status === 'syncing'}
              >
                {connection.status === 'syncing' ? 'Syncing…' : 'Sync now'}
              </Button>
            </div>
          </CardContent>

          <CardFooter className="justify-between">
            <p className="text-xs text-muted-foreground">
              Threads flow into your shared workspace.
            </p>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isPending}
            >
              {isPending ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </CardFooter>
        </>
      )}

      {error && !connection?.error_message && (
        <CardContent>
          <p className="text-xs text-destructive">{error}</p>
        </CardContent>
      )}
    </Card>
  )
}
