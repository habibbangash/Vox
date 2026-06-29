// HubSpot CRM source — OAuth token exchange + data fetching
// Syncs contacts, deals, notes, calls, and emails into source_documents.

export interface HubSpotTokens {
  access_token: string
  refresh_token: string
  expires_in: number    // seconds
  hub_id: number
  hub_domain: string
}

export interface HubSpotObject {
  id: string
  properties: Record<string, string | null>
  createdAt: string
  updatedAt: string
}

export interface HubSpotEngagement {
  id: string
  type: 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING'
  body: string
  createdAt: string
  associatedContactIds: string[]
  associatedDealIds: string[]
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

export async function exchangeHubSpotCode(
  code: string,
  redirectUri: string
): Promise<HubSpotTokens | null> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.HUBSPOT_CLIENT_ID ?? '',
    client_secret: process.env.HUBSPOT_CLIENT_SECRET ?? '',
    redirect_uri: redirectUri,
    code,
  })

  const res = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) return null
  const data = await res.json()
  if (data.error) return null
  return data as HubSpotTokens
}

export async function refreshHubSpotToken(
  refreshToken: string
): Promise<HubSpotTokens | null> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.HUBSPOT_CLIENT_ID ?? '',
    client_secret: process.env.HUBSPOT_CLIENT_SECRET ?? '',
    refresh_token: refreshToken,
  })

  const res = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) return null
  const data = await res.json()
  if (data.error) return null
  return data as HubSpotTokens
}

export async function getHubSpotPortalInfo(
  accessToken: string
): Promise<{ portalId: number; domain: string } | null> {
  const res = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken)
  if (!res.ok) return null
  const data = await res.json()
  return { portalId: data.hub_id, domain: data.hub_domain ?? '' }
}

// ─── CRM fetching ─────────────────────────────────────────────────────────────

async function fetchCrmObjects(
  accessToken: string,
  objectType: string,
  properties: string[],
  after?: string
): Promise<{ results: HubSpotObject[]; nextCursor?: string }> {
  const params = new URLSearchParams({
    limit: '100',
    properties: properties.join(','),
  })
  if (after) params.set('after', after)

  const res = await fetch(
    `https://api.hubapi.com/crm/v3/objects/${objectType}?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) return { results: [] }

  const data = await res.json()
  return {
    results: (data.results ?? []) as HubSpotObject[],
    nextCursor: data.paging?.next?.after,
  }
}

export async function fetchAllContacts(
  accessToken: string
): Promise<HubSpotObject[]> {
  const props = ['firstname', 'lastname', 'email', 'company', 'jobtitle', 'hs_lead_status', 'notes_last_contacted']
  const results: HubSpotObject[] = []
  let cursor: string | undefined

  do {
    const page = await fetchCrmObjects(accessToken, 'contacts', props, cursor)
    results.push(...page.results)
    cursor = page.nextCursor
  } while (cursor)

  return results
}

export async function fetchAllDeals(
  accessToken: string
): Promise<HubSpotObject[]> {
  const props = ['dealname', 'dealstage', 'amount', 'closedate', 'pipeline', 'hs_lastmodifieddate', 'description']
  const results: HubSpotObject[] = []
  let cursor: string | undefined

  do {
    const page = await fetchCrmObjects(accessToken, 'deals', props, cursor)
    results.push(...page.results)
    cursor = page.nextCursor
  } while (cursor)

  return results
}

export async function fetchAllNotes(
  accessToken: string
): Promise<HubSpotObject[]> {
  const props = ['hs_note_body', 'hs_timestamp', 'hubspot_owner_id']
  const results: HubSpotObject[] = []
  let cursor: string | undefined

  do {
    const page = await fetchCrmObjects(accessToken, 'notes', props, cursor)
    results.push(...page.results)
    cursor = page.nextCursor
  } while (cursor)

  return results.filter((n) => {
    const body = n.properties['hs_note_body'] ?? ''
    return body.trim().length > 30
  })
}

export async function fetchAllCalls(
  accessToken: string
): Promise<HubSpotObject[]> {
  const props = ['hs_call_title', 'hs_call_body', 'hs_call_duration', 'hs_timestamp', 'hs_call_status']
  const results: HubSpotObject[] = []
  let cursor: string | undefined

  do {
    const page = await fetchCrmObjects(accessToken, 'calls', props, cursor)
    results.push(...page.results)
    cursor = page.nextCursor
  } while (cursor)

  return results.filter((c) => {
    const body = c.properties['hs_call_body'] ?? ''
    return body.trim().length > 30
  })
}

// ─── Single-object fetchers (used by webhook handler) ────────────────────────

export async function fetchNoteById(
  accessToken: string,
  noteId: string
): Promise<HubSpotObject | null> {
  const props = ['hs_note_body', 'hs_timestamp', 'hubspot_owner_id']
  const res = await fetch(
    `https://api.hubapi.com/crm/v3/objects/notes/${noteId}?properties=${props.join(',')}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data as HubSpotObject
}

export async function fetchCallById(
  accessToken: string,
  callId: string
): Promise<HubSpotObject | null> {
  const props = ['hs_call_title', 'hs_call_body', 'hs_call_duration', 'hs_timestamp', 'hs_call_status']
  const res = await fetch(
    `https://api.hubapi.com/crm/v3/objects/calls/${callId}?properties=${props.join(',')}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data as HubSpotObject
}

// ─── Document builders ────────────────────────────────────────────────────────

export function contactToDocument(
  contact: HubSpotObject,
  workspaceId: string,
  connectionId: string
) {
  const { firstname, lastname, email, company, jobtitle } = contact.properties
  const name = [firstname, lastname].filter(Boolean).join(' ') || email || `Contact ${contact.id}`
  const lines = [
    company ? `Company: ${company}` : null,
    jobtitle ? `Title: ${jobtitle}` : null,
    email ? `Email: ${email}` : null,
  ].filter(Boolean)

  return {
    workspace_id: workspaceId,
    connection_id: connectionId,
    source_type: 'hubspot',
    external_id: `contact_${contact.id}`,
    title: name,
    content: `HubSpot Contact: ${name}\n${lines.join('\n')}`,
    author_name: name,
    metadata: { object_type: 'contact', hub_id: contact.id } as Record<string, unknown>,
    processed: false,
    ingested_at: new Date().toISOString(),
  }
}

export function dealToDocument(
  deal: HubSpotObject,
  workspaceId: string,
  connectionId: string
) {
  const { dealname, dealstage, amount, description } = deal.properties
  const title = dealname ?? `Deal ${deal.id}`
  const lines = [
    dealstage ? `Stage: ${dealstage}` : null,
    amount ? `Amount: $${Number(amount).toLocaleString()}` : null,
    description ? `\n${description}` : null,
  ].filter(Boolean)

  return {
    workspace_id: workspaceId,
    connection_id: connectionId,
    source_type: 'hubspot',
    external_id: `deal_${deal.id}`,
    title,
    content: `HubSpot Deal: ${title}\n${lines.join('\n')}`,
    author_name: null,
    metadata: { object_type: 'deal', hub_id: deal.id, stage: dealstage } as Record<string, unknown>,
    processed: false,
    ingested_at: new Date().toISOString(),
  }
}

export function noteToDocument(
  note: HubSpotObject,
  workspaceId: string,
  connectionId: string
) {
  const body = note.properties['hs_note_body'] ?? ''
  const ts = note.properties['hs_timestamp'] ?? note.createdAt
  const date = ts ? new Date(ts).toLocaleDateString() : ''

  return {
    workspace_id: workspaceId,
    connection_id: connectionId,
    source_type: 'hubspot',
    external_id: `note_${note.id}`,
    title: `HubSpot Note — ${date}`,
    content: body,
    author_name: null,
    metadata: { object_type: 'note', hub_id: note.id } as Record<string, unknown>,
    processed: false,
    ingested_at: new Date().toISOString(),
  }
}

export function callToDocument(
  call: HubSpotObject,
  workspaceId: string,
  connectionId: string
) {
  const title = call.properties['hs_call_title'] ?? 'HubSpot Call'
  const body = call.properties['hs_call_body'] ?? ''
  const ts = call.properties['hs_timestamp'] ?? call.createdAt
  const date = ts ? new Date(ts).toLocaleDateString() : ''

  return {
    workspace_id: workspaceId,
    connection_id: connectionId,
    source_type: 'hubspot',
    external_id: `call_${call.id}`,
    title: `${title} — ${date}`,
    content: body,
    author_name: null,
    metadata: { object_type: 'call', hub_id: call.id } as Record<string, unknown>,
    processed: false,
    ingested_at: new Date().toISOString(),
  }
}
