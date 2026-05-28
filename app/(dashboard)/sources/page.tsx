import { verifySession } from '@/lib/supabase/dal'
import { adminClient } from '@/lib/supabase/admin'
import { getWorkspaceSettings } from '@/app/actions/workspace'
import { KrispCard } from './_components/krisp-card'
import { RssSection } from './_components/rss-section'
import { SlackCard } from './_components/slack-card'
import { GmailCard } from './_components/gmail-card'
import { HubSpotCard } from './_components/hubspot-card'
import { GranolaCard } from './_components/granola-card'
import { LinkedInCard } from './_components/linkedin-card'
import { EmailCard } from './_components/email-card'
import { ManualImport } from './_components/manual-import'
import { SourceHealthBanner, type HealthConnection } from './_components/source-health-banner'

export default async function SourcesPage() {
  const { user } = await verifySession()

  const [
    { data: krispConnection },
    { data: rssConnections },
    { data: slackConnection },
    { data: gmailConnection },
    { data: hubspotConnection },
    { data: linkedInConnection },
    { data: granolaConnection },
    wsSettings,
  ] = await Promise.all([
    adminClient
      .from('source_connections')
      .select('id, status, webhook_secret, last_synced_at, synced_count, error_message')
      .eq('user_id', user.id)
      .eq('source_type', 'krisp')
      .single(),
    adminClient
      .from('source_connections')
      .select('id, display_name, status, config, last_synced_at, synced_count, error_message')
      .eq('user_id', user.id)
      .eq('source_type', 'rss')
      .order('created_at', { ascending: true }),
    adminClient
      .from('source_connections')
      .select('id, display_name, status, config, last_synced_at, synced_count, error_message')
      .eq('user_id', user.id)
      .eq('source_type', 'slack')
      .single(),
    adminClient
      .from('source_connections')
      .select('id, display_name, status, config, last_synced_at, synced_count, error_message')
      .eq('user_id', user.id)
      .eq('source_type', 'gmail')
      .single(),
    adminClient
      .from('source_connections')
      .select('id, display_name, status, config, last_synced_at, synced_count, error_message')
      .eq('user_id', user.id)
      .eq('source_type', 'hubspot')
      .single(),
    adminClient
      .from('source_connections')
      .select('id, display_name, status, config')
      .eq('user_id', user.id)
      .eq('source_type', 'linkedin')
      .single(),
    adminClient
      .from('source_connections')
      .select('id, display_name, status, last_synced_at, synced_count, error_message')
      .eq('user_id', user.id)
      .eq('source_type', 'granola')
      .single(),
    getWorkspaceSettings(),
  ])

  const healthConnections: HealthConnection[] = [
    krispConnection   && { id: krispConnection.id,   source_type: 'krisp',   display_name: null,                          error_message: (krispConnection as { error_message?: string | null }).error_message ?? null, last_synced_at: krispConnection.last_synced_at ?? null },
    slackConnection   && { id: slackConnection.id,   source_type: 'slack',   display_name: slackConnection.display_name ?? null,   error_message: slackConnection.error_message ?? null,   last_synced_at: slackConnection.last_synced_at ?? null },
    gmailConnection   && { id: gmailConnection.id,   source_type: 'gmail',   display_name: gmailConnection.display_name ?? null,   error_message: gmailConnection.error_message ?? null,   last_synced_at: gmailConnection.last_synced_at ?? null },
    hubspotConnection && { id: hubspotConnection.id, source_type: 'hubspot', display_name: hubspotConnection.display_name ?? null, error_message: hubspotConnection.error_message ?? null, last_synced_at: hubspotConnection.last_synced_at ?? null },
    granolaConnection && { id: granolaConnection.id, source_type: 'granola', display_name: granolaConnection.display_name ?? null, error_message: granolaConnection.error_message ?? null, last_synced_at: granolaConnection.last_synced_at ?? null },
    ...((rssConnections ?? []).map((c) => ({ id: c.id, source_type: 'rss', display_name: c.display_name ?? null, error_message: c.error_message ?? null, last_synced_at: c.last_synced_at ?? null }))),
  ].filter(Boolean) as HealthConnection[]

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Sources</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Connect your meeting tools and content feeds to automatically ingest data into your workspace.
      </p>

      <SourceHealthBanner connections={healthConnections} />

      <div className="space-y-4">
        <KrispCard connection={krispConnection ?? null} />
        <RssSection connections={(rssConnections ?? []) as Parameters<typeof RssSection>[0]['connections']} />
        <SlackCard connection={slackConnection ?? null} />
        <GmailCard connection={gmailConnection ?? null} />
        <HubSpotCard connection={hubspotConnection ?? null} />
        <GranolaCard connection={granolaConnection ?? null} />
        <ManualImport />
      </div>

      <div className="mt-10 mb-6">
        <h2 className="text-base font-semibold mb-0.5">Publishing channels</h2>
        <p className="text-xs text-muted-foreground">
          Connect channels to publish content directly from the Content editor.
        </p>
      </div>

      <div className="space-y-4">
        <LinkedInCard connection={linkedInConnection ?? null} />
        <EmailCard
          configured={!!wsSettings.resend_api_key}
          fromName={wsSettings.resend_from_name}
          fromEmail={wsSettings.resend_from_email}
        />
      </div>
    </div>
  )
}
