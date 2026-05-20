'use client'
import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { connectKrisp, disconnectSource } from '@/app/actions/sources'

interface KrispConnection {
  id: string
  status: string
  webhook_secret: string | null
  last_synced_at: string | null
  synced_count: number
}

interface KrispCardProps {
  connection: KrispConnection | null
}

export function KrispCard({ connection }: KrispCardProps) {
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const webhookUrl = connection?.webhook_secret
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/krisp?token=${connection.webhook_secret}`
    : null

  function handleConnect() {
    setError(null)
    startTransition(async () => {
      const result = await connectKrisp(undefined)
      if (result?.error) setError(result.error)
    })
  }

  function handleDisconnect() {
    if (!connection) return
    setError(null)
    startTransition(async () => {
      const result = await disconnectSource(connection.id)
      if (result?.error) setError(result.error)
    })
  }

  async function handleCopy() {
    if (!webhookUrl) return
    await navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-base">🎙</span>
          <CardTitle>Krisp</CardTitle>
          {connection && (
            <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              Connected
            </span>
          )}
        </div>
        <CardDescription>
          Automatically ingest meeting transcripts from Krisp into your workspace.
        </CardDescription>
        {!connection && (
          <CardAction>
            <Button size="sm" onClick={handleConnect} disabled={isPending}>
              {isPending ? 'Connecting…' : 'Connect'}
            </Button>
          </CardAction>
        )}
      </CardHeader>

      {connection && webhookUrl && (
        <>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Webhook URL</p>
              <p className="text-xs text-muted-foreground">
                Paste this in Krisp → Settings → Integrations → Webhooks
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={webhookUrl}
                  className="h-7 font-mono text-xs"
                />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{connection.synced_count}</span> transcripts ingested
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
          </CardContent>

          <CardFooter className="justify-between">
            <p className="text-xs text-muted-foreground">
              Transcripts flow into your shared workspace automatically.
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

      {error && (
        <CardContent>
          <p className="text-xs text-destructive">{error}</p>
        </CardContent>
      )}
    </Card>
  )
}
