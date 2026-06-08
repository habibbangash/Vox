'use client'
import { AlertTriangle } from 'lucide-react'

const SOURCE_LABELS: Record<string, string> = {
  krisp:   'Krisp',
  rss:     'RSS',
  slack:   'Slack',
  gmail:   'Gmail',
  hubspot: 'HubSpot',
  granola: 'Granola',
  linkedin:'LinkedIn',
  manual:  'Manual',
}

const SOURCE_STYLE: Record<string, string> = {
  krisp:   'bg-violet-500/10 text-violet-600',
  rss:     'bg-blue-500/10 text-blue-600',
  slack:   'bg-green-500/10 text-green-600',
  gmail:   'bg-red-500/10 text-red-600',
  hubspot: 'bg-orange-500/10 text-orange-600',
  granola: 'bg-amber-500/10 text-amber-600',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export interface HealthConnection {
  id:            string
  source_type:   string
  display_name:  string | null
  error_message: string | null
  last_synced_at:string | null
}

interface SourceHealthBannerProps {
  connections: HealthConnection[]
}

export function SourceHealthBanner({ connections }: SourceHealthBannerProps) {
  const errored = connections.filter((c) => c.error_message)
  if (errored.length === 0) return null

  return (
    <div className="mb-8 rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertTriangle className="size-4 shrink-0" />
        {errored.length === 1
          ? '1 source needs attention'
          : `${errored.length} sources need attention`}
      </div>

      <div className="space-y-2">
        {errored.map((c) => (
          <div key={c.id} className="flex items-start gap-3">
            <span
              className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                SOURCE_STYLE[c.source_type] ?? 'bg-muted text-muted-foreground'
              }`}
            >
              {SOURCE_LABELS[c.source_type] ?? c.source_type}
            </span>
            <div className="min-w-0 space-y-0.5">
              {c.display_name && (
                <p className="text-xs font-medium text-foreground truncate">{c.display_name}</p>
              )}
              <p className="text-xs text-muted-foreground line-clamp-2">{c.error_message}</p>
              {c.last_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Last synced {relativeTime(c.last_synced_at)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Scroll down to reconnect the affected source, or wait for the next auto-sync.
      </p>
    </div>
  )
}
