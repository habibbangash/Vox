import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`)

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) return NextResponse.redirect(`${origin}/login?error=auth_failed`)

  // New Google user — check if they already belong to a workspace
  const { data: membership } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.redirect(`${origin}/onboarding/workspace`)
  }

  const redirectTo = next.startsWith('/') ? `${origin}${next}` : `${origin}/dashboard`
  return NextResponse.redirect(redirectTo)
}
