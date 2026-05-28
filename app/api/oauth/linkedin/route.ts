import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const state = randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 300 })

  const origin = request.nextUrl.origin
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID ?? 'LINKEDIN_CLIENT_ID_NOT_SET',
    redirect_uri: `${origin}/api/oauth/linkedin/callback`,
    state,
    scope: 'openid profile email w_member_social',
  })

  return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
}
