const MCP_URL = 'https://mcp.granola.ai/mcp'
const TOKEN_URL = 'https://mcp-auth.granola.ai/oauth2/token'

export interface GranolaTokens {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

export interface GranolaMeeting {
  id: string
  title: string
  date: string
  participants: string
  summary: string
}

// ─── Token refresh ────────────────────────────────────────────────────────────

export async function refreshGranolaToken(
  refreshToken: string,
  clientMetadataUrl: string
): Promise<GranolaTokens | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientMetadataUrl,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.access_token) return null
    return data as GranolaTokens
  } catch {
    return null
  }
}

// ─── MCP HTTP client ──────────────────────────────────────────────────────────

interface MCPCallResult {
  text: string | null
  error: string | null
}

async function mcpToolCall(
  accessToken: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<MCPCallResult> {
  // 1. Initialize session
  const initRes = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'vox', version: '1.0' },
      },
    }),
  })

  if (!initRes.ok) {
    return { text: null, error: `MCP init failed: ${initRes.status}` }
  }

  const sessionId = initRes.headers.get('mcp-session-id') ?? ''

  const sessionHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  }
  if (sessionId) sessionHeaders['Mcp-Session-Id'] = sessionId

  // 2. Send initialized notification
  await fetch(MCP_URL, {
    method: 'POST',
    headers: { ...sessionHeaders, Accept: 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  })

  // 3. Call the tool
  const toolRes = await fetch(MCP_URL, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  })

  if (!toolRes.ok) {
    return { text: null, error: `MCP tool call failed: ${toolRes.status}` }
  }

  const contentType = toolRes.headers.get('content-type') ?? ''

  // Handle SSE response (server chose to stream even though we preferred JSON)
  if (contentType.includes('text/event-stream')) {
    const raw = await toolRes.text()
    const dataLine = raw.split('\n').find(l => l.startsWith('data:'))
    if (!dataLine) return { text: null, error: 'Empty SSE response' }
    try {
      const parsed = JSON.parse(dataLine.slice(5).trim())
      const text = parsed?.result?.content?.[0]?.text ?? null
      return { text, error: text ? null : 'No content in SSE response' }
    } catch {
      return { text: null, error: 'Failed to parse SSE response' }
    }
  }

  const data = await toolRes.json()

  if (data.error) {
    return { text: null, error: data.error.message ?? 'MCP error' }
  }

  const text = data?.result?.content?.[0]?.text ?? null
  return { text, error: text ? null : 'No content in MCP response' }
}

// ─── XML-like response parsers ────────────────────────────────────────────────

// Parses the <meetings_data> envelope returned by list_meetings and get_meetings
export function parseMeetingsText(xml: string): GranolaMeeting[] {
  const meetings: GranolaMeeting[] = []
  // Match each <meeting ...> block
  const meetingBlocks = xml.matchAll(
    /<meeting\s+id="([^"]+)"\s+title="([^"]+)"\s+date="([^"]+)"[^>]*>([\s\S]*?)<\/meeting>/g
  )

  for (const [, id, title, date, body] of meetingBlocks) {
    const participantsMatch = body.match(/<known_participants>([\s\S]*?)<\/known_participants>/)
    const participants = participantsMatch ? participantsMatch[1].trim() : ''

    const summaryMatch = body.match(/<summary>([\s\S]*?)<\/summary>/)
    const summary = summaryMatch ? summaryMatch[1].trim() : ''

    meetings.push({ id, title, date, participants, summary })
  }

  return meetings
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

export async function listMeetingIds(accessToken: string): Promise<{ id: string; title: string }[]> {
  const { text, error } = await mcpToolCall(accessToken, 'list_meetings', {
    time_range: 'last_30_days',
  })
  if (error || !text) return []

  const meetings: { id: string; title: string }[] = []
  for (const [, id, title] of text.matchAll(/<meeting\s+id="([^"]+)"\s+title="([^"]+)"/g)) {
    meetings.push({ id, title })
  }
  return meetings
}

export async function getMeetingsWithSummary(
  accessToken: string,
  ids: string[]
): Promise<GranolaMeeting[]> {
  if (ids.length === 0) return []

  // Fetch in batches of 10 (API limit)
  const allMeetings: GranolaMeeting[] = []
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10)
    const { text, error } = await mcpToolCall(accessToken, 'get_meetings', {
      meeting_ids: batch,
    })
    if (error || !text) continue
    allMeetings.push(...parseMeetingsText(text))
  }
  return allMeetings
}

// ─── Document builder ─────────────────────────────────────────────────────────

export function meetingToDocument(
  meeting: GranolaMeeting,
  workspaceId: string,
  connectionId: string
) {
  return {
    workspace_id: workspaceId,
    connection_id: connectionId,
    source_type: 'granola',
    external_id: meeting.id,
    title: meeting.title,
    content: meeting.summary || `Meeting: ${meeting.title}`,
    author_name: null as string | null,
    metadata: {
      granola_meeting_id: meeting.id,
      date: meeting.date,
      participants: meeting.participants,
    } as Record<string, unknown>,
    processed: false,
    ingested_at: new Date().toISOString(),
  }
}
