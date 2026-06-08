import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const base = request.nextUrl.origin

  if (error) {
    return NextResponse.redirect(new URL('/sources?error=granola_denied', base))
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('granola_oauth_state')?.value
  const codeVerifier = cookieStore.get('granola_code_verifier')?.value

  if (!state || state !== savedState || !codeVerifier || !code) {
    return NextResponse.redirect(new URL('/sources?error=granola_state', base))
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
    return NextResponse.redirect(new URL('/sources?error=granola_state', base))
  }

  // Exchange code for tokens using PKCE (no client secret)
  const tokenRes = await fetch('https://mcp-auth.granola.ai/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${base}/api/oauth/granola/callback`,
      client_id: `${base}/api/oauth/granola/metadata`,
      code_verifier: codeVerifier,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/sources?error=granola_token', base))
  }

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
  }

  if (!tokens.access_token) {
    return NextResponse.redirect(new URL('/sources?error=granola_token', base))
  }

  const { data: existing } = await adminClient
    .from('source_connections')
    .select('id')
    .eq('workspace_id', member.workspace_id)
    .eq('user_id', user.id)
    .eq('source_type', 'granola')
    .single()

  let connectionId: string

  if (existing) {
    await adminClient
      .from('source_connections')
      .update({ display_name: 'Granola', status: 'active', error_message: null })
      .eq('id', existing.id)
    connectionId = existing.id
  } else {
    const { data: inserted } = await adminClient
      .from('source_connections')
      .insert({
        workspace_id: member.workspace_id,
        user_id: user.id,
        source_type: 'granola',
        display_name: 'Granola',
        status: 'active',
        config: {},
      })
      .select('id')
      .single()

    if (!inserted) {
      return NextResponse.redirect(new URL('/sources?error=granola_token', base))
    }
    connectionId = inserted.id
  }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null

  await adminClient
    .from('source_credentials')
    .upsert(
      {
        connection_id: connectionId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_type: 'bearer',
        ...(expiresAt ? { expires_at: expiresAt } : {}),
      },
      { onConflict: 'connection_id' }
    )

  cookieStore.delete('granola_oauth_state')
  cookieStore.delete('granola_code_verifier')

  return NextResponse.redirect(new URL('/sources?granola=connected', base))
}
