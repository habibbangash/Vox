'use server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export interface DocumentResult {
  id: string
  title: string
  snippet: string
  source_type: string
  author_name: string | null
  ingested_at: string
  similarity?: number
}

export interface SearchResult {
  results: DocumentResult[]
  query: string
  error?: string
}

export interface RecentResult {
  documents: DocumentResult[]
  total: number
  unprocessed: number
}

function makeSnippet(content: string, maxLen = 280): string {
  const clean = content.replace(/\*\*[^*]+\*\*/g, '').replace(/\n+/g, ' ').trim()
  return clean.length > maxLen ? clean.slice(0, maxLen) + '…' : clean
}

async function getWorkspaceId(userId: string): Promise<string | null> {
  const { data } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .single()
  return data?.workspace_id ?? null
}

export async function searchDocuments(query: string): Promise<SearchResult> {
  if (!query || query.trim().length < 3) {
    return { results: [], query }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { results: [], query, error: 'Not authenticated' }

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return { results: [], query, error: 'No workspace' }

  // Embed the query via the embed-query Edge Function
  let embedding: number[]
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embed-query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ text: query.trim() }),
      }
    )
    if (!res.ok) throw new Error(`embed-query returned ${res.status}`)
    const json = await res.json()
    embedding = json.embedding
  } catch (err) {
    return { results: [], query, error: err instanceof Error ? err.message : 'Embedding failed' }
  }

  // Run cosine similarity search
  const { data, error } = await adminClient.rpc('match_documents', {
    query_embedding: embedding,
    p_workspace_id: workspaceId,
    match_count: 10,
    threshold: 0.35,
  })

  if (error) return { results: [], query, error: error.message }

  const results: DocumentResult[] = (data ?? []).map((row: {
    id: string; title: string; content: string; source_type: string;
    author_name: string | null; ingested_at: string; similarity: number
  }) => ({
    id: row.id,
    title: row.title ?? 'Untitled',
    snippet: makeSnippet(row.content),
    source_type: row.source_type,
    author_name: row.author_name,
    ingested_at: row.ingested_at,
    similarity: Math.round(row.similarity * 100),
  }))

  return { results, query }
}

export async function getRecentDocuments(): Promise<RecentResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { documents: [], total: 0, unprocessed: 0 }

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return { documents: [], total: 0, unprocessed: 0 }

  const [{ data: recent }, { count: total }, { count: unprocessed }] = await Promise.all([
    adminClient
      .from('source_documents')
      .select('id, title, content, source_type, author_name, ingested_at')
      .eq('workspace_id', workspaceId)
      .order('ingested_at', { ascending: false })
      .limit(20),
    adminClient
      .from('source_documents')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    adminClient
      .from('source_documents')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .is('embedding', null),
  ])

  const documents: DocumentResult[] = (recent ?? []).map((row) => ({
    id: row.id,
    title: row.title ?? 'Untitled',
    snippet: makeSnippet(row.content),
    source_type: row.source_type,
    author_name: row.author_name ?? null,
    ingested_at: row.ingested_at,
  }))

  return {
    documents,
    total: total ?? 0,
    unprocessed: unprocessed ?? 0,
  }
}
