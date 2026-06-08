import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { exchangeSlackCode, fetchSlackChannels } from '@/lib/sources/slack'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const base = request.nextUrl.origin

  if (error) {
    return NextResponse.redirect(new URL('/sources?error=slack_denied', base))
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_state')?.value
  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL('/sources?error=slack_state', base))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', base))
  }

  const { data: member } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return NextResponse.redirect(new URL('/sources?error=slack_state', base))
  }

  const redirectUri = `${base}/api/oauth/slack/callback`
  const tokens = await exchangeSlackCode(code ?? '', redirectUri)
  if (!tokens) {
    return NextResponse.redirect(new URL('/sources?error=slack_token', base))
  }

  const channels = await fetchSlackChannels(tokens.access_token)

  const { data: existing } = await adminClient
    .from('source_connections')
    .select('id')
    .eq('workspace_id', member.workspace_id)
    .eq('user_id', user.id)
    .eq('source_type', 'slack')
    .single()

  let connectionId: string

  if (existing) {
    await adminClient
      .from('source_connections')
      .update({
        display_name: tokens.team_name,
        status: 'active',
        config: {
          team_id: tokens.team_id,
          slack_user_id: tokens.slack_user_id,
          available_channels: channels,
          selected_channel_ids: [],
        },
        error_message: null,
      })
      .eq('id', existing.id)
    connectionId = existing.id
  } else {
    const { data: inserted } = await adminClient
      .from('source_connections')
      .insert({
        workspace_id: member.workspace_id,
        user_id: user.id,
        source_type: 'slack',
        display_name: tokens.team_name,
        status: 'active',
        config: {
          team_id: tokens.team_id,
          slack_user_id: tokens.slack_user_id,
          available_channels: channels,
          selected_channel_ids: [],
        },
      })
      .select('id')
      .single()

    if (!inserted) {
      return NextResponse.redirect(new URL('/sources?error=slack_token', base))
    }
    connectionId = inserted.id
  }

  await adminClient
    .from('source_credentials')
    .upsert(
      { connection_id: connectionId, access_token: tokens.access_token, token_type: 'bearer' },
      { onConflict: 'connection_id' }
    )

  cookieStore.delete('oauth_state')

  return NextResponse.redirect(new URL('/sources?slack=connected', base))
}
