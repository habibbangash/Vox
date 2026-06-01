'use client'
import { Mail } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface EmailCardProps {
  configured: boolean
  fromName?: string | null
  fromEmail?: string | null
}

export function EmailCard({ configured, fromName, fromEmail }: EmailCardProps) {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-blue-500" />
          <CardTitle>Email</CardTitle>
          {configured && (
            <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              Connected — {fromName ?? fromEmail}
            </span>
          )}
        </div>
        <CardDescription>
          Send email drafts directly from the Content editor via Resend.
        </CardDescription>
        {!configured && (
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => { window.location.href = '/settings' }}>
              Configure in Settings
            </Button>
          </CardAction>
        )}
      </CardHeader>
      {configured && (
        <div className="px-6 pb-4">
          <p className="text-xs text-muted-foreground">
            Sending from <span className="text-foreground font-medium">{fromName ? `${fromName} <${fromEmail}>` : fromEmail}</span>.
            Configure or change this in{' '}
            <a href="/settings" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Settings → Email publishing
            </a>.
          </p>
        </div>
      )}
    </Card>
  )
}
