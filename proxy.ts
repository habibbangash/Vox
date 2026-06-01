import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Start with a pass-through response. The setAll callback below will
  // rebuild this if tokens are refreshed, so we always return the latest copy.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          // Mirror updated tokens onto the request so downstream server code
          // in the same request cycle sees the refreshed session.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Rebuild the response with the updated request reference.
          supabaseResponse = NextResponse.next({ request })
          // Write the refreshed tokens to the response cookies.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          // Apply cache-control headers provided by @supabase/ssr to prevent
          // CDNs from caching responses that carry Set-Cookie headers.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // IMPORTANT: Always call getUser() here, never getSession().
  // getSession() reads the JWT from the cookie without validating it against
  // the Supabase Auth server — it cannot be trusted for access control.
  // getUser() makes a network call to validate, and also triggers token
  // refresh if the access token is expired.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const protectedPrefixes = ['/dashboard', '/sources', '/intelligence', '/content', '/onboarding', '/settings']
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  // Unauthenticated users cannot access protected routes
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated users don't need to be on login/signup
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Return the (possibly rebuilt) response so refreshed tokens are sent
  // back to the browser
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)',
  ],
}
