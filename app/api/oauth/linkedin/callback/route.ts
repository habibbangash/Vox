import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { exchangeLinkedInCode, getLinkedInProfile } from '@/lib/sources/linkedin'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const base  = request.nextUrl.origin

  if (error) return NextResponse.redirect(new URL('/sources?error=linkedin_denied', base))

  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_state')?.value
  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL('/sources?error=linkedin_state', base))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', base))

  const { data: member } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.redirect(new URL('/sources?error=linkedin_state', base))

  const redirectUri = `${base}/api/oauth/linkedin/callback`
  const tokens = await exchangeLinkedInCode(code ?? '', redirectUri)
  if (!tokens) return NextResponse.redirect(new URL('/sources?error=linkedin_token', base))

  const profile = await getLinkedInProfile(tokens.access_token)
  if (!profile) return NextResponse.redirect(new URL('/sources?error=linkedin_token', base))

  const displayName = profile.name ?? profile.email ?? 'LinkedIn'

  const { data: existing } = await adminClient
    .from('source_connections')
    .select('id')
    .eq('workspace_id', member.workspace_id)
    .eq('user_id', user.id)
    .eq('source_type', 'linkedin')
    .single()

  let connectionId: string

  if (existing) {
    await adminClient
      .from('source_connections')
      .update({
        display_name: displayName,
        status: 'active',
        config: { person_id: profile.sub, name: profile.name, email: profile.email },
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
        source_type: 'linkedin',
        display_name: displayName,
        status: 'active',
        config: { person_id: profile.sub, name: profile.name, email: profile.email },
      })
      .select('id')
      .single()

    if (!inserted) return NextResponse.redirect(new URL('/sources?error=linkedin_token', base))
    connectionId = inserted.id
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await adminClient
    .from('source_credentials')
    .upsert(
      {
        connection_id: connectionId,
        access_token: tokens.access_token,
        token_type: 'bearer',
        expires_at: expiresAt,
      },
      { onConflict: 'connection_id' }
    )

  cookieStore.delete('oauth_state')

  return NextResponse.redirect(new URL('/content?linkedin=connected', base))
}
