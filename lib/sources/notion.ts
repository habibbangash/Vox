const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

function headers(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
}

export interface NotionTokenResponse {
  access_token: string
  workspace_id: string
  workspace_name: string
  owner: { user?: { id: string; name?: string; person?: { email?: string } } }
}

export async function exchangeNotionCode(
  code: string,
  redirectUri: string
): Promise<NotionTokenResponse | null> {
  const clientId = process.env.NOTION_CLIENT_ID
  const clientSecret = process.env.NOTION_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(`${NOTION_API}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  })
  if (!res.ok) return null
  return res.json()
}

interface NotionBlock {
  type: string
  [key: string]: unknown
}

function extractBlockText(block: NotionBlock): string {
  const richTextTypes = [
    'paragraph', 'heading_1', 'heading_2', 'heading_3',
    'bulleted_list_item', 'numbered_list_item', 'toggle',
    'quote', 'callout',
  ]
  for (const t of richTextTypes) {
    if (block.type === t) {
      const content = (block[t] as { rich_text?: { plain_text: string }[] } | undefined)
      if (!content?.rich_text) return ''
      return content.rich_text.map((r) => r.plain_text).join('')
    }
  }
  return ''
}

async function fetchBlockChildren(blockId: string, accessToken: string): Promise<string> {
  let cursor: string | undefined
  const lines: string[] = []

  do {
    const url = new URL(`${NOTION_API}/blocks/${blockId}/children`)
    url.searchParams.set('page_size', '100')
    if (cursor) url.searchParams.set('start_cursor', cursor)

    const res = await fetch(url.toString(), { headers: headers(accessToken) })
    if (!res.ok) break
    const json = await res.json() as { results: NotionBlock[]; has_more: boolean; next_cursor?: string }

    for (const block of json.results) {
      const text = extractBlockText(block)
      if (text) lines.push(text)
    }

    cursor = json.has_more ? json.next_cursor : undefined
  } while (cursor)

  return lines.join('\n')
}

export interface NotionPage {
  id: string
  title: string
  url: string
  lastEdited: string
  content: string
}

export async function fetchNotionPages(accessToken: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = []
  let cursor: string | undefined

  do {
    const body: Record<string, unknown> = {
      filter: { property: 'object', value: 'page' },
      page_size: 100,
    }
    if (cursor) body.start_cursor = cursor

    const res = await fetch(`${NOTION_API}/search`, {
      method: 'POST',
      headers: headers(accessToken),
      body: JSON.stringify(body),
    })

    if (!res.ok) break

    const json = await res.json() as {
      results: Array<{
        id: string
        url: string
        last_edited_time: string
        properties: Record<string, { title?: { plain_text: string }[] }>
      }>
      has_more: boolean
      next_cursor?: string
    }

    for (const page of json.results) {
      const titleProp = Object.values(page.properties).find((p) => p.title)
      const title = titleProp?.title?.map((t) => t.plain_text).join('') ?? 'Untitled'

      const content = await fetchBlockChildren(page.id, accessToken)
      if (!content.trim()) continue

      pages.push({
        id: page.id,
        title,
        url: page.url,
        lastEdited: page.last_edited_time,
        content,
      })
    }

    cursor = json.has_more ? json.next_cursor : undefined
  } while (cursor)

  return pages
}

export function pageToDocument(
  page: NotionPage,
  workspaceId: string,
  connectionId: string
) {
  return {
    workspace_id: workspaceId,
    connection_id: connectionId,
    source_type: 'notion' as const,
    external_id: page.id,
    title: page.title,
    content: page.content,
    author_name: null,
    url: page.url,
    ingested_at: new Date().toISOString(),
    processed: false,
  }
}
