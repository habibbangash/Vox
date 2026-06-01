export interface LinkedInTokens {
  access_token: string
  expires_in: number
  refresh_token?: string
  refresh_token_expires_in?: number
  scope: string
}

export interface LinkedInProfile {
  sub: string
  name: string
  email?: string
}

export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<LinkedInTokens | null> {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile | null> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  return res.json()
}

export async function publishLinkedInPost(
  accessToken: string,
  personId: string,
  text: string
): Promise<{ postId?: string; error?: string }> {
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${personId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    return { error: `LinkedIn API error ${res.status}: ${body.slice(0, 200)}` }
  }

  const postId = res.headers.get('x-restli-id') ?? undefined
  return { postId }
}
