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
    maxAge: 300,
  })

  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/oauth/hubspot/callback`

  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID ?? 'HUBSPOT_CLIENT_ID_NOT_SET',
    redirect_uri: redirectUri,
    scope: 'crm.objects.contacts.read crm.objects.deals.read crm.objects.notes.read crm.objects.calls.read',
    optional_scope: 'crm.objects.companies.read',
    state,
  })

  return NextResponse.redirect(
    `https://app.hubspot.com/oauth/authorize?${params}`
  )
}
