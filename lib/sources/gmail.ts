export interface GoogleTokenResult {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface GmailThread {
  id: string
  subject: string
  from: string
  body: string
  date: string
}

function decodeBase64Url(s: string): string {
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  return Buffer.from(padded, 'base64').toString('utf-8')
}

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResult | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      client_id: process.env.GOOGLE_CLIENT_ID ?? 'GOOGLE_CLIENT_ID_NOT_SET',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? 'GOOGLE_CLIENT_SECRET_NOT_SET',
      grant_type: 'authorization_code',
    }).toString(),
  })

  if (!res.ok) return null

  const data = await res.json()
  if (!data.access_token) return null

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? '',
    expires_in: data.expires_in ?? 3600,
  }
}

export async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? 'GOOGLE_CLIENT_ID_NOT_SET',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? 'GOOGLE_CLIENT_SECRET_NOT_SET',
      grant_type: 'refresh_token',
    }).toString(),
  })

  if (!res.ok) return null

  const data = await res.json()
  return data.access_token ?? null
}

export async function getGmailUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const data = await res.json()
  return data.emailAddress ?? ''
}

function extractTextFromPayload(payload: Record<string, unknown>): string {
  const mimeType = payload.mimeType as string | undefined
  const parts = payload.parts as Record<string, unknown>[] | undefined
  const body = payload.body as Record<string, unknown> | undefined

  if (mimeType === 'text/plain' && body?.data) {
    return decodeBase64Url(body.data as string)
  }

  if (parts) {
    for (const part of parts) {
      const text = extractTextFromPayload(part)
      if (text) return text
    }
  }

  return ''
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export async function fetchThreads(
  accessToken: string,
  query = 'newer_than:90d',
  maxResults = 50
): Promise<GmailThread[]> {
  const listParams = new URLSearchParams({
    q: query,
    maxResults: String(Math.min(maxResults, 50)),
  })

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads?${listParams}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!listRes.ok) return []

  const listData = await listRes.json()
  const threadRefs: { id: string }[] = listData.threads ?? []

  const threads: GmailThread[] = []

  for (const ref of threadRefs.slice(0, 50)) {
    const threadRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${ref.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!threadRes.ok) continue

    const threadData = await threadRes.json()
    const messages: Record<string, unknown>[] = threadData.messages ?? []
    if (messages.length === 0) continue

    const firstMessage = messages[0]
    const payload = firstMessage.payload as Record<string, unknown> | undefined
    if (!payload) continue

    const headers = (payload.headers ?? []) as { name: string; value: string }[]
    const subject = getHeader(headers, 'subject') || '(no subject)'
    const from = getHeader(headers, 'from')
    const date = getHeader(headers, 'date')

    const bodyParts = messages.map((msg) => {
      const msgPayload = msg.payload as Record<string, unknown> | undefined
      if (!msgPayload) return ''
      return extractTextFromPayload(msgPayload)
    })

    const body = bodyParts.filter(Boolean).join('\n\n---\n\n')

    threads.push({ id: ref.id, subject, from, body, date })
  }

  return threads
}
