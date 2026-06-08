'use client'
import { useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { disconnectSource } from '@/app/actions/sources'

interface LinkedInConnection {
  id: string
  display_name: string | null
  status: string
  config: { person_id?: string; name?: string; email?: string }
}

interface LinkedInCardProps {
  connection: LinkedInConnection | null
}

export function LinkedInCard({ connection }: LinkedInCardProps) {
  const [isPending, startTransition] = useTransition()

  function handleConnect() {
    window.location.href = '/api/oauth/linkedin'
  }

  function handleDisconnect() {
    if (!connection) return
    if (!confirm('Disconnect LinkedIn? Published drafts will no longer be sent from this account.')) return
    startTransition(async () => {
      await disconnectSource(connection.id)
    })
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-[#0077B5]">in</span>
          <CardTitle>LinkedIn</CardTitle>
          {connection && (
            <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              Connected — {connection.display_name}
            </span>
          )}
        </div>
        <CardDescription>
          Publish LinkedIn posts directly from the Content editor with one click.
        </CardDescription>
        {!connection && (
          <CardAction>
            <Button size="sm" onClick={handleConnect}>
              Connect LinkedIn
            </Button>
          </CardAction>
        )}
      </CardHeader>

      {connection && (
        <>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Authenticated as{' '}
              <span className="font-medium text-foreground">
                {connection.config?.name ?? connection.display_name}
              </span>
              {connection.config?.email && ` (${connection.config.email})`}.
              Posts are published publicly from this account.
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
