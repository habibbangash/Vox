export interface SlackOAuthResult {
  access_token: string
  team_id: string
  team_name: string
  slack_user_id: string
}

export interface SlackChannel {
  id: string
  name: string
  is_private: boolean
  num_members: number
}

export interface SlackMessage {
  ts: string
  user: string
  text: string
}

export async function exchangeSlackCode(
  code: string,
  redirectUri: string
): Promise<SlackOAuthResult | null> {
  const params = new URLSearchParams({
    code,
    redirect_uri: redirectUri,
    client_id: process.env.SLACK_CLIENT_ID ?? 'SLACK_CLIENT_ID_NOT_SET',
    client_secret: process.env.SLACK_CLIENT_SECRET ?? 'SLACK_CLIENT_SECRET_NOT_SET',
  })

  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) return null

  const data = await res.json()
  if (!data.ok) return null

  return {
    access_token: data.authed_user?.access_token ?? '',
    team_id: data.team?.id ?? '',
    team_name: data.team?.name ?? '',
    slack_user_id: data.authed_user?.id ?? '',
  }
}

export async function fetchSlackChannels(accessToken: string): Promise<SlackChannel[]> {
  const params = new URLSearchParams({
    types: 'public_channel,private_channel',
    exclude_archived: 'true',
    limit: '200',
  })

  const res = await fetch(`https://slack.com/api/conversations.list?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) return []

  const data = await res.json()
  if (!data.ok) return []

  return (data.channels ?? []).map((ch: Record<string, unknown>) => ({
    id: ch.id as string,
    name: ch.name as string,
    is_private: (ch.is_private as boolean) ?? false,
    num_members: (ch.num_members as number) ?? 0,
  }))
}

export async function fetchChannelMessages(
  accessToken: string,
  channelId: string,
  oldest?: string
): Promise<SlackMessage[]> {
  const params = new URLSearchParams({ channel: channelId })
  if (oldest) params.set('oldest', oldest)

  const res = await fetch(`https://slack.com/api/conversations.history?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) return []

  const data = await res.json()
  if (!data.ok) return []

  return ((data.messages ?? []) as Record<string, unknown>[])
    .filter(
      (msg) =>
        !msg.subtype &&
        typeof msg.text === 'string' &&
        msg.text.length > 20
    )
    .map((msg) => ({
      ts: msg.ts as string,
      user: (msg.user as string) ?? '',
      text: msg.text as string,
    }))
}

export async function fetchUserName(
  accessToken: string,
  userId: string
): Promise<string | null> {
  const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) return null

  const data = await res.json()
  if (!data.ok) return null

  const profile = data.user?.profile
  return (
    profile?.display_name ||
    profile?.real_name ||
    data.user?.name ||
    null
  )
}

export function slackTsToDate(ts: string): string {
  const seconds = parseFloat(ts)
  return new Date(seconds * 1000).toISOString()
}
