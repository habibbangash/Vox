import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { exchangeHubSpotCode, getHubSpotPortalInfo } from '@/lib/sources/hubspot'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const base = request.nextUrl.origin

  if (error) {
    return NextResponse.redirect(new URL('/sources?error=hubspot_denied', base))
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_state')?.value
  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL('/sources?error=hubspot_state', base))
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
    return NextResponse.redirect(new URL('/sources?error=hubspot_state', base))
  }

  const redirectUri = `${base}/api/oauth/hubspot/callback`
  const tokens = await exchangeHubSpotCode(code ?? '', redirectUri)
  if (!tokens) {
    return NextResponse.redirect(new URL('/sources?error=hubspot_token', base))
  }

  const portal = await getHubSpotPortalInfo(tokens.access_token)
  const displayName = portal?.domain ?? `HubSpot Portal ${tokens.hub_id}`

  const { data: existing } = await adminClient
    .from('source_connections')
    .select('id')
    .eq('workspace_id', member.workspace_id)
    .eq('user_id', user.id)
    .eq('source_type', 'hubspot')
    .single()

  let connectionId: string

  if (existing) {
    await adminClient
      .from('source_connections')
      .update({
        display_name: displayName,
        status: 'active',
        config: { hub_id: tokens.hub_id, hub_domain: portal?.domain },
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
        source_type: 'hubspot',
        display_name: displayName,
        status: 'active',
        config: { hub_id: tokens.hub_id, hub_domain: portal?.domain },
      })
      .select('id')
      .single()

    if (!inserted) {
      return NextResponse.redirect(new URL('/sources?error=hubspot_token', base))
    }
    connectionId = inserted.id
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await adminClient
    .from('source_credentials')
    .upsert(
      {
        connection_id: connectionId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: 'bearer',
        expires_at: expiresAt,
      },
      { onConflict: 'connection_id' }
    )

  cookieStore.delete('oauth_state')

  return NextResponse.redirect(new URL('/sources?hubspot=connected', base))
}
