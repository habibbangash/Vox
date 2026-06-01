import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const state = randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 300,
  })

  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/oauth/notion/callback`

  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID ?? 'NOTION_CLIENT_ID_NOT_SET',
    response_type: 'code',
    owner: 'user',
    redirect_uri: redirectUri,
    state,
  })

  return NextResponse.redirect(
    `https://api.notion.com/v1/oauth/authorize?${params}`
  )
}
