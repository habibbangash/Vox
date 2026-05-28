import { verifySession } from '@/lib/supabase/dal'
import { adminClient } from '@/lib/supabase/admin'
import { getWorkspaceSettings } from '@/app/actions/workspace'
import { KrispCard } from './_components/krisp-card'
import { RssSection } from './_components/rss-section'
import { SlackCard } from './_components/slack-card'
import { GmailCard } from './_components/gmail-card'
import { HubSpotCard } from './_components/hubspot-card'
import { GranolaCard } from './_components/granola-card'
import { NotionCard } from './_components/notion-card'
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
    { data: notionConnection },
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
    adminClient
      .from('source_connections')
      .select('id, display_name, status, config, last_synced_at, synced_count, error_message')
      .eq('user_id', user.id)
      .eq('source_type', 'notion')
      .single(),
    getWorkspaceSettings(),
  ])

  const noneConnected =
    !krispConnection && !slackConnection && !gmailConnection &&
    !hubspotConnection && !granolaConnection && !notionConnection && (rssConnections ?? []).length === 0

  const healthConnections: HealthConnection[] = [
    krispConnection   && { id: krispConnection.id,   source_type: 'krisp',   display_name: null,                          error_message: (krispConnection as { error_message?: string | null }).error_message ?? null, last_synced_at: krispConnection.last_synced_at ?? null },
    slackConnection   && { id: slackConnection.id,   source_type: 'slack',   display_name: slackConnection.display_name ?? null,   error_message: slackConnection.error_message ?? null,   last_synced_at: slackConnection.last_synced_at ?? null },
    gmailConnection   && { id: gmailConnection.id,   source_type: 'gmail',   display_name: gmailConnection.display_name ?? null,   error_message: gmailConnection.error_message ?? null,   last_synced_at: gmailConnection.last_synced_at ?? null },
    hubspotConnection && { id: hubspotConnection.id, source_type: 'hubspot', display_name: hubspotConnection.display_name ?? null, error_message: hubspotConnection.error_message ?? null, last_synced_at: hubspotConnection.last_synced_at ?? null },
    granolaConnection && { id: granolaConnection.id, source_type: 'granola', display_name: granolaConnection.display_name ?? null, error_message: granolaConnection.error_message ?? null, last_synced_at: granolaConnection.last_synced_at ?? null },
    notionConnection  && { id: notionConnection.id,  source_type: 'notion',  display_name: notionConnection.display_name ?? null,  error_message: notionConnection.error_message ?? null,  last_synced_at: notionConnection.last_synced_at ?? null },
    ...((rssConnections ?? []).map((c) => ({ id: c.id, source_type: 'rss', display_name: c.display_name ?? null, error_message: c.error_message ?? null, last_synced_at: c.last_synced_at ?? null }))),
  ].filter(Boolean) as HealthConnection[]

  const startHereConnected = !!krispConnection || (rssConnections ?? []).length > 0
  const popularConnected   = !!slackConnection || !!gmailConnection || !!hubspotConnection
  const advancedConnected  = !!granolaConnection || !!notionConnection

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Sources</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Connect your meeting tools and content feeds to automatically ingest data into your workspace.
      </p>

      <SourceHealthBanner connections={healthConnections} />

      {noneConnected && (
        <div className="mb-8 rounded-lg border border-dashed px-6 py-6 space-y-2">
          <p className="text-sm font-semibold">Start with the fastest sources</p>
          <p className="text-xs text-muted-foreground max-w-prose leading-relaxed">
            Krisp and RSS are the quickest to connect — under 5 minutes each.
            Once data starts flowing, Vox automatically surfaces signals for content.
          </p>
        </div>
      )}

      {/* ── START HERE ───────────────────────────────────────────── */}
      <section className="space-y-4 mb-10">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              Start here
              {startHereConnected && (
                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                  Connected
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Fastest to set up — under 5 minutes</p>
          </div>
        </div>
        <KrispCard connection={krispConnection ?? null} />
        <RssSection connections={(rssConnections ?? []) as Parameters<typeof RssSection>[0]['connections']} />
      </section>

      {/* ── POPULAR SOURCES ──────────────────────────────────────── */}
      <section className="space-y-4 mb-10">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            Popular sources
            {popularConnected && (
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                Connected
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">OAuth-based — about 10 minutes each</p>
        </div>
        <SlackCard connection={slackConnection ?? null} />
        <GmailCard connection={gmailConnection ?? null} />
        <HubSpotCard connection={hubspotConnection ?? null} />
      </section>

      {/* ── MORE TOOLS ───────────────────────────────────────────── */}
      <section className="space-y-4 mb-10">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            More tools
            {advancedConnected && (
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                Connected
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Meeting notes, wikis, and manual uploads</p>
        </div>
        <GranolaCard connection={granolaConnection ?? null} />
        <NotionCard connection={notionConnection ? {
          ...notionConnection,
          config: (notionConnection.config ?? {}) as { workspace_id?: string; owner_name?: string | null; owner_email?: string | null },
        } : null} />
        <ManualImport />
      </section>

      {/* ── PUBLISHING CHANNELS ──────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Publishing channels</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect channels to publish content directly from the Content editor.
          </p>
        </div>
        <LinkedInCard connection={linkedInConnection ?? null} />
        <EmailCard
          configured={!!wsSettings.resend_api_key}
          fromName={wsSettings.resend_from_name}
          fromEmail={wsSettings.resend_from_email}
        />
      </section>
    </div>
  )
}
