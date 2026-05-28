'use server'
import Anthropic from '@anthropic-ai/sdk'
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
      .eq('processed', false),
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

export interface DocumentDetail {
  id:          string
  title:       string
  content:     string
  source_type: string
  author_name: string | null
  ingested_at: string
  url:         string | null
}

export async function getDocument(id: string): Promise<{ document: DocumentDetail | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { document: null, error: 'Not authenticated' }

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return { document: null, error: 'No workspace' }

  const { data, error } = await adminClient
    .from('source_documents')
    .select('id, title, content, source_type, author_name, ingested_at, url')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !data) return { document: null, error: error?.message ?? 'Not found' }

  return {
    document: {
      id:          data.id,
      title:       data.title ?? 'Untitled',
      content:     data.content ?? '',
      source_type: data.source_type,
      author_name: data.author_name ?? null,
      ingested_at: data.ingested_at,
      url:         (data as { url?: string | null }).url ?? null,
    },
  }
}

export interface TopEntity {
  id:             string
  type:           string
  canonical_name: string
  mention_count:  number
}

export async function getTopEntities(limit = 30): Promise<TopEntity[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return []

  // Aggregate mention counts per entity in one query
  const { data } = await adminClient
    .from('entity_mentions')
    .select('entity_id, entities!inner(id, type, canonical_name)')
    .eq('workspace_id', workspaceId)

  if (!data || data.length === 0) return []

  const counts: Record<string, { entity: { id: string; type: string; canonical_name: string }; count: number }> = {}

  for (const row of data) {
    const entity = row.entities as unknown as { id: string; type: string; canonical_name: string }
    if (!entity) continue
    if (!counts[entity.id]) {
      counts[entity.id] = { entity, count: 0 }
    }
    counts[entity.id].count++
  }

  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ entity, count }) => ({
      id: entity.id,
      type: entity.type,
      canonical_name: entity.canonical_name,
      mention_count: count,
    }))
}

// ─── RAG answer ───────────────────────────────────────────────────────────────

async function resolveAnthropicKey(workspaceId: string): Promise<string | null> {
  const { data: ws } = await adminClient
    .from('workspaces')
    .select('settings')
    .eq('id', workspaceId)
    .single()
  const settings = ws?.settings as Record<string, string> | null
  return settings?.['anthropic_api_key'] ?? process.env.ANTHROPIC_API_KEY ?? null
}

export async function answerFromDocuments(
  query: string,
  docs: DocumentResult[]
): Promise<{ answer?: string; error?: string }> {
  if (!query.trim() || docs.length === 0) return { error: 'No documents to answer from' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return { error: 'No workspace' }

  const apiKey = await resolveAnthropicKey(workspaceId)
  if (!apiKey) return { error: 'No Anthropic API key configured — add one in Settings.' }

  const context = docs
    .map((d, i) => `[${i + 1}] ${d.title}\n${d.snippet}`)
    .join('\n\n')

  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Based on the following excerpts from internal documents, answer this question concisely in 2–4 sentences. Cite the relevant document titles. If the documents don't contain enough information to answer confidently, say so.\n\nQuestion: ${query}\n\nDocuments:\n${context}`,
      },
    ],
  })

  const answer = (message.content[0] as { type: string; text?: string }).text ?? ''
  return { answer }
}
