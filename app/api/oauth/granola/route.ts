import { randomBytes, createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const origin = request.nextUrl.origin

  // PKCE — Granola requires S256 code challenge
  const codeVerifier = randomBytes(48).toString('base64url')
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  const state = randomBytes(16).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set('granola_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 300 })
  cookieStore.set('granola_code_verifier', codeVerifier, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 300 })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: `${origin}/api/oauth/granola/metadata`,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: `${origin}/api/oauth/granola/callback`,
    state,
    scope: 'email offline_access openid profile',
    prompt: 'consent',
    resource: 'https://mcp.granola.ai/mcp',
  })

  return NextResponse.redirect(
    `https://mcp-auth.granola.ai/oauth2/authorize?${params}`
  )
}
