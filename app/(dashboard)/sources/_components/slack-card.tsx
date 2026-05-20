'use client'
import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { saveSlackChannels, syncSlack, disconnectSource } from '@/app/actions/sources'

interface SlackConnection {
  id: string
  display_name: string | null
  status: string
  config: {
    available_channels?: { id: string; name: string; is_private: boolean }[]
    selected_channel_ids?: string[]
    team_id?: string
  }
  last_synced_at: string | null
  synced_count: number
  error_message?: string | null
}

interface SlackCardProps {
  connection: SlackConnection | null
}

export function SlackCard({ connection }: SlackCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>(
    connection?.config?.selected_channel_ids ?? []
  )

  function handleConnect() {
    window.location.href = '/api/oauth/slack'
  }

  function handleDisconnect() {
    if (!connection) return
    setError(null)
    startTransition(async () => {
      const result = await disconnectSource(connection.id)
      if (result?.error) setError(result.error)
    })
  }

  function handleToggleChannel(channelId: string) {
    setSelected((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    )
  }

  function handleSaveChannels() {
    if (!connection) return
    setError(null)
    startTransition(async () => {
      const result = await saveSlackChannels(connection.id, selected)
      if (result?.error) setError(result.error)
    })
  }

  function handleSync() {
    if (!connection) return
    setError(null)
    startTransition(async () => {
      const result = await syncSlack(connection.id)
      if (result?.error) setError(result.error)
    })
  }

  const availableChannels = connection?.config?.available_channels ?? []

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-base">#</span>
          <CardTitle>Slack</CardTitle>
          {connection && (
            <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              Connected — {connection.display_name}
            </span>
          )}
        </div>
        <CardDescription>
          Ingest conversations from your Slack workspace. Select the channels you want to monitor.
        </CardDescription>
        {!connection && (
          <CardAction>
            <Button size="sm" onClick={handleConnect}>
              Connect Slack
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

            {availableChannels.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Channels</p>
                <div
                  className="rounded-lg border bg-muted/30 px-3 py-2 space-y-1"
                  style={{ maxHeight: 200, overflowY: 'auto' }}
                >
                  {availableChannels.map((ch) => (
                    <label key={ch.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(ch.id)}
                        onChange={() => handleToggleChannel(ch.id)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs text-foreground">
                        {ch.is_private ? '🔒' : '#'} {ch.name}
                      </span>
                    </label>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveChannels}
                  disabled={isPending}
                >
                  {isPending ? 'Saving…' : 'Save channels'}
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{connection.synced_count}</span> messages ingested
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
              Messages flow into your shared workspace.
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
