import { NextResponse, type NextRequest } from 'next/server'

// Granola uses OAuth 2.0 Dynamic Client Registration (RFC 7591).
// The client_id is the URL of this metadata document. The auth server
// fetches this URL to verify the client and its allowed redirect URIs.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin

  const metadata = {
    client_id: `${origin}/api/oauth/granola/metadata`,
    client_name: 'Vox',
    redirect_uris: [`${origin}/api/oauth/granola/callback`],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: 'email offline_access openid profile',
  }

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
