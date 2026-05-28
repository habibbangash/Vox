import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/publishing/resend'

export const runtime = 'nodejs'
export const maxDuration = 120

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  recurring_topic:    'Recurring Topic',
  objection_trend:    'Objection Trend',
  buying_signal:      'Buying Signal',
  competitor_mention: 'Competitor Mention',
}

const SOURCE_TYPE_LABEL: Record<string, string> = {
  krisp:   'Krisp meetings',
  granola: 'Granola notes',
  rss:     'Articles',
  slack:   'Slack messages',
  gmail:   'Emails',
  hubspot: 'HubSpot records',
  manual:  'Manual imports',
  notion:  'Notion pages',
}

function buildDigestHtml(opts: {
  workspaceName: string
  signals: { title: string; signal_type: string; description: string | null; source_count: number }[]
  docsBySource: { source_type: string; count: number }[]
  appUrl: string
}): string {
  const { workspaceName, signals, docsBySource, appUrl } = opts

  const signalRows = signals.length > 0
    ? signals.map(s => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1e2535">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:#1e2a3a;color:#93c5fd;white-space:nowrap;margin-top:1px">${SIGNAL_TYPE_LABEL[s.signal_type] ?? s.signal_type}</span>
            <div>
              <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#f1f5f9">${s.title}</p>
              ${s.description ? `<p style="margin:0;font-size:13px;color:#64748b;line-height:1.5">${s.description}</p>` : ''}
              <p style="margin:4px 0 0;font-size:11px;color:#475569">${s.source_count} source${s.source_count !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </td>
      </tr>`).join('')
    : `<tr><td style="padding:16px 0;color:#475569;font-size:13px">No new signals this week. Keep ingesting content.</td></tr>`

  const sourceRows = docsBySource.length > 0
    ? docsBySource.map(d => `
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#94a3b8">${SOURCE_TYPE_LABEL[d.source_type] ?? d.source_type}</td>
        <td style="padding:6px 0;font-size:13px;color:#f1f5f9;text-align:right;font-weight:600">${d.count}</td>
      </tr>`).join('')
    : `<tr><td colspan="2" style="padding:10px 0;color:#475569;font-size:13px">No new content ingested this week.</td></tr>`

  const totalDocs = docsBySource.reduce((sum, d) => sum + d.count, 0)

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="padding-bottom:32px">
          <p style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;letter-spacing:-0.5px">Vox</p>
          <p style="margin:4px 0 0;font-size:13px;color:#475569">Weekly intelligence digest — ${workspaceName}</p>
        </td></tr>

        <!-- Signals -->
        <tr><td style="background:#111827;border:1px solid #1e2535;border-radius:12px;padding:24px;margin-bottom:16px">
          <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#475569">Top signals this week</p>
          <table width="100%" cellpadding="0" cellspacing="0">${signalRows}</table>
          <div style="margin-top:20px">
            <a href="${appUrl}/content" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">
              Draft from signals →
            </a>
          </div>
        </td></tr>

        <tr><td style="height:12px"></td></tr>

        <!-- Ingestion summary -->
        <tr><td style="background:#111827;border:1px solid #1e2535;border-radius:12px;padding:24px">
          <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#475569">
            Content ingested this week
            ${totalDocs > 0 ? `<span style="color:#3b82f6;margin-left:8px">${totalDocs} total</span>` : ''}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">${sourceRows}</table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:32px">
          <p style="margin:0;font-size:12px;color:#334155;line-height:1.6">
            You're receiving this because you're a Vox workspace owner.
            <a href="${appUrl}/settings" style="color:#475569;text-decoration:underline">Manage preferences</a>.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vox.app'
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Find all workspaces with Resend configured
  const { data: workspaces } = await adminClient
    .from('workspaces')
    .select('id, name, settings')

  if (!workspaces?.length) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const results: { workspaceId: string; status: string; error?: string }[] = []

  for (const workspace of workspaces) {
    const settings = workspace.settings as Record<string, string> | null
    const resendKey = settings?.resend_api_key
    const fromName = settings?.resend_from_name
    const fromEmail = settings?.resend_from_email

    if (!resendKey || !fromEmail) continue

    try {
      // Get workspace owner email
      const { data: owner } = await adminClient
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspace.id)
        .eq('role', 'owner')
        .single()

      if (!owner) continue

      const { data: { user } } = await adminClient.auth.admin.getUserById(owner.user_id)
      const ownerEmail = user?.email
      if (!ownerEmail) continue

      // Top 5 signals this week
      const { data: signals } = await adminClient
        .from('signals')
        .select('title, signal_type, description, source_count')
        .eq('workspace_id', workspace.id)
        .gte('computed_at', sevenDaysAgo)
        .order('source_count', { ascending: false })
        .limit(5)

      // Doc count by source type this week
      const { data: rawDocs } = await adminClient
        .from('source_documents')
        .select('source_type')
        .eq('workspace_id', workspace.id)
        .gte('ingested_at', sevenDaysAgo)

      const docsBySource = Object.entries(
        (rawDocs ?? []).reduce<Record<string, number>>((acc, d) => {
          acc[d.source_type] = (acc[d.source_type] ?? 0) + 1
          return acc
        }, {})
      )
        .map(([source_type, count]) => ({ source_type, count }))
        .sort((a, b) => b.count - a.count)

      const html = buildDigestHtml({
        workspaceName: workspace.name ?? 'Your workspace',
        signals: signals ?? [],
        docsBySource,
        appUrl,
      })

      const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail
      const weekOf = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

      const result = await sendEmail(resendKey, {
        from,
        to: ownerEmail,
        subject: `Your Vox digest — week of ${weekOf}`,
        html,
        text: `Weekly intelligence digest for ${workspace.name ?? 'your workspace'}. Open Vox to view your signals: ${appUrl}/content`,
      })

      results.push({
        workspaceId: workspace.id,
        status: result.error ? 'error' : 'sent',
        error: result.error,
      })
    } catch (err) {
      results.push({
        workspaceId: workspace.id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  const sent = results.filter(r => r.status === 'sent').length
  return NextResponse.json({ ok: true, sent, results })
}
