'use client'
import { useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { syncHubSpot, disconnectSource } from '@/app/actions/sources'
import { relativeTime } from '@/lib/utils'

interface HubSpotConnection {
  id: string
  display_name: string | null
  status: string
  config: { hub_id?: number; hub_domain?: string }
  last_synced_at: string | null
  synced_count: number
  error_message?: string | null
}

interface HubSpotCardProps {
  connection: HubSpotConnection | null
}

export function HubSpotCard({ connection }: HubSpotCardProps) {
  const [isPending, startTransition] = useTransition()

  function handleConnect() {
    window.location.href = '/api/oauth/hubspot'
  }

  function handleDisconnect() {
    if (!connection) return
    startTransition(async () => {
      await disconnectSource(connection.id)
    })
  }

  function handleSync() {
    if (!connection) return
    startTransition(async () => {
      await syncHubSpot(connection.id)
    })
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-[#ff7a59]">H</span>
          <CardTitle>HubSpot</CardTitle>
          {connection && (
            <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              Connected — {connection.display_name}
            </span>
          )}
        </div>
        <CardDescription>
          Ingest contacts, deals, notes, and call transcripts from your HubSpot CRM.
        </CardDescription>
        {!connection && (
          <CardAction>
            <Button size="sm" onClick={handleConnect}>
              Connect HubSpot
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
                  <span className="font-medium text-foreground">{connection.synced_count}</span> records ingested
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
              Syncs contacts, deals, notes, and call logs. Sensitive fields (emails, phone numbers) are not ingested.
            </p>
          </CardContent>

          <CardFooter className="justify-between">
            <p className="text-xs text-muted-foreground">
              Portal: {connection.config?.hub_domain ?? connection.config?.hub_id ?? '—'}
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
    </Card>
  )
}
