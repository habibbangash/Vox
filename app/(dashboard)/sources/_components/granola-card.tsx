'use client'
import { useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { syncGranola, disconnectSource } from '@/app/actions/sources'
import { relativeTime } from '@/lib/utils'

interface GranolaConnection {
  id: string
  display_name: string | null
  status: string
  last_synced_at: string | null
  synced_count: number
  error_message?: string | null
}

interface GranolaCardProps {
  connection: GranolaConnection | null
}

export function GranolaCard({ connection }: GranolaCardProps) {
  const [isPending, startTransition] = useTransition()

  function handleConnect() {
    window.location.href = '/api/oauth/granola'
  }

  function handleSync() {
    if (!connection) return
    startTransition(async () => {
      await syncGranola(connection.id)
    })
  }

  function handleDisconnect() {
    if (!connection) return
    startTransition(async () => {
      await disconnectSource(connection.id)
    })
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-violet-500">G</span>
          <CardTitle>Granola</CardTitle>
          {connection && (
            <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              Connected
            </span>
          )}
        </div>
        <CardDescription>
          Ingest AI meeting notes and summaries from Granola into your intelligence layer.
        </CardDescription>
        {!connection && (
          <CardAction>
            <Button size="sm" onClick={handleConnect}>
              Connect Granola
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

            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{connection.synced_count}</span> meetings ingested
                </span>
                {connection.last_synced_at && (
                  <span>
                    Last synced{' '}
                    <span className="font-medium text-foreground">
                      {relativeTime(connection.last_synced_at)}
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

            <p className="text-xs text-muted-foreground">
              Syncs meeting summaries from the last 30 days. Transcripts require a paid Granola tier.
            </p>
          </CardContent>

          <CardFooter className="justify-end">
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
    </Card>
  )
}
