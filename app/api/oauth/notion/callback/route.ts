import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { exchangeNotionCode } from '@/lib/sources/notion'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const base = request.nextUrl.origin

  if (error) {
    return NextResponse.redirect(new URL('/sources?error=notion_denied', base))
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_state')?.value
  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL('/sources?error=notion_state', base))
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
    return NextResponse.redirect(new URL('/sources?error=notion_state', base))
  }

  const redirectUri = `${base}/api/oauth/notion/callback`
  const tokens = await exchangeNotionCode(code ?? '', redirectUri)
  if (!tokens) {
    return NextResponse.redirect(new URL('/sources?error=notion_token', base))
  }

  const ownerName = tokens.owner.user?.name ?? null
  const ownerEmail = tokens.owner.user?.person?.email ?? null

  const { data: existing } = await adminClient
    .from('source_connections')
    .select('id')
    .eq('workspace_id', member.workspace_id)
    .eq('user_id', user.id)
    .eq('source_type', 'notion')
    .single()

  let connectionId: string

  if (existing) {
    await adminClient
      .from('source_connections')
      .update({
        display_name: tokens.workspace_name,
        status: 'active',
        config: { workspace_id: tokens.workspace_id, owner_name: ownerName, owner_email: ownerEmail },
        error_message: null,
      })
      .eq('id', existing.id)
    connectionId = existing.id

    await adminClient
      .from('source_credentials')
      .update({ access_token: tokens.access_token })
      .eq('connection_id', existing.id)
  } else {
    const { data: inserted } = await adminClient
      .from('source_connections')
      .insert({
        workspace_id: member.workspace_id,
        user_id: user.id,
        source_type: 'notion',
        display_name: tokens.workspace_name,
        status: 'active',
        config: { workspace_id: tokens.workspace_id, owner_name: ownerName, owner_email: ownerEmail },
        synced_count: 0,
      })
      .select('id')
      .single()

    if (!inserted) {
      return NextResponse.redirect(new URL('/sources?error=notion_db', base))
    }
    connectionId = inserted.id

    await adminClient
      .from('source_credentials')
      .insert({ connection_id: connectionId, access_token: tokens.access_token })
  }

  return NextResponse.redirect(new URL('/sources?connected=notion', base))
}
