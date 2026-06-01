import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Vox/1.0 RSS reader' },
})

export interface RSSItem {
  external_id: string
  title: string
  content: string
  author_name: string | null
  url: string | null
  published_at: string | null
}

export interface RSSFeed {
  title: string
  description: string | null
  items: RSSItem[]
}

export async function fetchFeed(url: string): Promise<RSSFeed> {
  const feed = await parser.parseURL(url)

  const items: RSSItem[] = (feed.items ?? []).map((item) => {
    const external_id = item.guid ?? item.link ?? item.title ?? crypto.randomUUID()
    const title = item.title ?? 'Untitled'
    // prefer full content over summary
    const content = item['content:encoded'] ?? item.content ?? item.contentSnippet ?? item.summary ?? ''
    const author_name = item.creator ?? item.author ?? null
    const url = item.link ?? null
    const published_at = item.isoDate ?? item.pubDate ?? null

    return { external_id, title, content, author_name, url, published_at }
  })

  return {
    title: feed.title ?? url,
    description: feed.description ?? null,
    items,
  }
}

export async function validateFeedUrl(url: string): Promise<{ valid: boolean; title?: string; error?: string }> {
  try {
    const feed = await fetchFeed(url)
    return { valid: true, title: feed.title }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Could not fetch feed' }
  }
}
