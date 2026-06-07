'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

async function resolveGroqKey(workspaceId: string): Promise<string | null> {
  const { data: ws } = await adminClient
    .from('workspaces')
    .select('settings')
    .eq('id', workspaceId)
    .single()

  const settings = ws?.settings as Record<string, string> | null
  return settings?.['groq_api_key'] ?? process.env.GROQ_API_KEY ?? null
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentFormat = 'linkedin_post' | 'email_sequence' | 'blog_post' | 'battle_card'
export type DraftStatus   = 'brief' | 'draft' | 'review' | 'published'

export interface Brief {
  topic?:           string
  angle?:           string
  key_points?:      string[]
  target_audience?: string
}

export interface ContentDraft {
  id:                string
  workspace_id:      string
  author_profile_id: string | null
  format:            ContentFormat
  status:            DraftStatus
  title:             string
  brief:             Brief
  body:              string | null
  published_url:     string | null
  published_at:      string | null
  created_at:        string
  updated_at:        string
}

export interface AuthorProfile {
  id:           string
  workspace_id: string
  user_id:      string
  display_name: string
  role:         string | null
  voice_notes:  string | null
  created_at:   string
  updated_at:   string
}

export type SignalType = 'recurring_topic' | 'objection_trend' | 'buying_signal' | 'competitor_mention'

export interface Signal {
  id:             string
  workspace_id:   string
  signal_type:    SignalType
  entity_id:      string | null
  title:          string
  description:    string | null
  document_count: number
  source_count:   number
  time_window:    string
  computed_at:    string
  dismissed_at:   string | null
  pinned_at:      string | null
}

export type ContentActionState = { error?: string; success?: boolean; draftId?: string } | undefined

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface EntityRow { type: string; name: string; mention_count: number }

async function getEntityIntelligenceBlock(workspaceId: string, personaId?: string | null): Promise<string> {
  let query = adminClient
    .from('entity_mentions')
    .select('entities(type, name), document_id')
    .eq('workspace_id', workspaceId)
    .not('entities', 'is', null)
    .limit(500)

  // If persona specified, restrict to documents tagged for that persona
  if (personaId) {
    const { data: taggedDocs } = await adminClient
      .from('document_persona_tags')
      .select('document_id')
      .eq('persona_id', personaId)
      .eq('workspace_id', workspaceId)
      .limit(2000)

    const docIds = (taggedDocs ?? []).map((r) => r.document_id)
    if (docIds.length === 0) return ''
    query = query.in('document_id', docIds)
  }

  const { data: rows } = await query
  if (!rows?.length) return ''

  const counts = new Map<string, EntityRow>()
  for (const row of rows) {
    const e = row.entities as unknown as { type: string; name: string } | null
    if (!e) continue
    const key = `${e.type}::${e.name}`
    const existing = counts.get(key)
    if (existing) existing.mention_count++
    else counts.set(key, { type: e.type, name: e.name, mention_count: 1 })
  }

  const byType: Record<string, EntityRow[]> = {}
  for (const entity of counts.values()) {
    if (!byType[entity.type]) byType[entity.type] = []
    byType[entity.type].push(entity)
  }

  const typeLabels: Record<string, string> = {
    company:        'Companies',
    person:         'People',
    topic:          'Topics',
    objection:      'Objections',
    buying_signal:  'Buying signals',
    competitor:     'Competitors',
    product:        'Products',
    theme:          'Themes',
    other:          'Other',
  }

  const lines: string[] = []
  const orderedTypes = ['objection', 'buying_signal', 'topic', 'company', 'competitor', 'person', 'product', 'theme', 'other']
  for (const type of orderedTypes) {
    const entities = byType[type]
    if (!entities?.length) continue
    const top = entities
      .sort((a, b) => b.mention_count - a.mention_count)
      .slice(0, 6)
      .map((e) => `${e.name} (${e.mention_count})`)
      .join(', ')
    lines.push(`- ${typeLabels[type] ?? type}: ${top}`)
  }

  if (!lines.length) return ''

  const personaLabel = personaId ? ' (filtered to selected persona)' : ''
  return `\nWorkspace intelligence${personaLabel} — extracted from customer conversations:\n${lines.join('\n')}\nUse these entities to make the content feel grounded in real customer language.\n`
}

async function getWorkspaceId(userId: string): Promise<string | null> {
  const { data } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .single()
  return data?.workspace_id ?? null
}

async function requireWorkspace(): Promise<{ userId: string; workspaceId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return { error: 'No workspace' }
  return { userId: user.id, workspaceId }
}

// ─── Drafts ───────────────────────────────────────────────────────────────────

export async function getDrafts(): Promise<ContentDraft[]> {
  const result = await requireWorkspace()
  if ('error' in result) return []

  const { data } = await adminClient
    .from('content_drafts')
    .select('*')
    .eq('workspace_id', result.workspaceId)
    .order('updated_at', { ascending: false })

  return (data ?? []) as ContentDraft[]
}


export async function createDraft(
  state: ContentActionState,
  formData: FormData
): Promise<ContentActionState> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const title  = (formData.get('title')  as string)?.trim()
  const format = (formData.get('format') as ContentFormat) ?? 'linkedin_post'
  const topic  = (formData.get('topic')  as string)?.trim()

  if (!title) return { error: 'Title is required' }

  const brief: Brief = topic ? { topic } : {}

  const { data, error } = await adminClient
    .from('content_drafts')
    .insert({
      workspace_id: result.workspaceId,
      format,
      title,
      brief,
      status: 'brief',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Link any evidence documents selected during brief creation
  const sourceIds = (formData.get('source_document_ids') as string)
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (sourceIds && sourceIds.length > 0) {
    await adminClient.from('content_sources').insert(
      sourceIds.map((docId) => ({ draft_id: data.id, document_id: docId }))
    )
  }

  revalidatePath('/content')
  return { success: true, draftId: data.id }
}

export async function updateDraft(
  draftId: string,
  patch: Partial<Pick<ContentDraft, 'title' | 'body' | 'status' | 'brief' | 'author_profile_id'>>
): Promise<ContentActionState> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const { error } = await adminClient
    .from('content_drafts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', draftId)
    .eq('workspace_id', result.workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/content')
  return { success: true }
}

export async function deleteDraft(draftId: string): Promise<ContentActionState> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const { error } = await adminClient
    .from('content_drafts')
    .delete()
    .eq('id', draftId)
    .eq('workspace_id', result.workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/content')
  return { success: true }
}

// ─── Draft sources (provenance) ───────────────────────────────────────────────

export async function addDraftSource(
  draftId: string,
  documentId: string,
  snippet?: string
): Promise<ContentActionState> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const { data: draft } = await adminClient
    .from('content_drafts')
    .select('id')
    .eq('id', draftId)
    .eq('workspace_id', result.workspaceId)
    .single()
  if (!draft) return { error: 'Draft not found' }

  const { error } = await adminClient
    .from('content_sources')
    .upsert({ draft_id: draftId, document_id: documentId, snippet }, { onConflict: 'draft_id,document_id' })

  if (error) return { error: error.message }

  revalidatePath('/content')
  return { success: true }
}

export async function removeDraftSource(draftId: string, documentId: string): Promise<ContentActionState> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const { data: draft } = await adminClient
    .from('content_drafts')
    .select('id')
    .eq('id', draftId)
    .eq('workspace_id', result.workspaceId)
    .single()
  if (!draft) return { error: 'Draft not found' }

  const { error } = await adminClient
    .from('content_sources')
    .delete()
    .eq('draft_id', draftId)
    .eq('document_id', documentId)

  if (error) return { error: error.message }

  revalidatePath('/content')
  return { success: true }
}

export async function getDraftSources(draftId: string) {
  const result = await requireWorkspace()
  if ('error' in result) return []

  const { data: draft } = await adminClient
    .from('content_drafts')
    .select('id')
    .eq('id', draftId)
    .eq('workspace_id', result.workspaceId)
    .single()
  if (!draft) return []

  const { data } = await adminClient
    .from('content_sources')
    .select('id, document_id, snippet, created_at, source_documents(id, title, content, source_type, author_name, ingested_at)')
    .eq('draft_id', draftId)
    .order('created_at', { ascending: true })

  return data ?? []
}

// ─── Signals (stub) ───────────────────────────────────────────────────────────

export async function getSignals(): Promise<Signal[]> {
  const result = await requireWorkspace()
  if ('error' in result) return []

  const { data } = await adminClient
    .from('signals')
    .select('*')
    .eq('workspace_id', result.workspaceId)
    .is('dismissed_at', null)
    .order('document_count', { ascending: false })
    .limit(50)

  return (data ?? []) as Signal[]
}

export async function dismissSignal(signalId: string): Promise<{ error?: string }> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const { error } = await adminClient
    .from('signals')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', signalId)
    .eq('workspace_id', result.workspaceId)

  if (error) return { error: error.message }
  return {}
}

export async function pinSignal(signalId: string, pin: boolean): Promise<{ error?: string }> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const { error } = await adminClient
    .from('signals')
    .update({ pinned_at: pin ? new Date().toISOString() : null })
    .eq('id', signalId)
    .eq('workspace_id', result.workspaceId)

  if (error) return { error: error.message }
  revalidatePath('/content')
  return {}
}

export async function computeSignals(): Promise<{ error?: string }> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const { error } = await adminClient.rpc('compute_signals')
  if (error) return { error: error.message }

  revalidatePath('/content')
  return {}
}

// ─── Draft generation from signal ────────────────────────────────────────────

const SIGNAL_PROMPTS: Record<SignalType, (topic: string, format: ContentFormat) => string> = {
  recurring_topic: (topic, format) => format === 'linkedin_post'
    ? `Write a LinkedIn post (150–250 words) about "${topic}" based on customer conversations.
Open with a bold, counterintuitive insight. Weave in customer language naturally. Close with a question or observation that invites comments. Do not name the company or use marketing speak.`
    : `Write a short cold email (100–150 words) that opens a conversation about "${topic}".
Use the customer language in the snippets as the hook. One CTA only. No fluff.`,

  objection_trend: (topic, format) => format === 'linkedin_post'
    ? `Write a LinkedIn post (150–250 words) that directly addresses the objection: "${topic}".
Acknowledge the concern honestly, reframe it with a surprising insight from real customer conversations, and end with a takeaway. Do not be defensive or salesy.`
    : `Write a battle-card-style email (100–150 words) that proactively addresses "${topic}" for a prospect who might have this concern. One clear, honest answer. One CTA.`,

  buying_signal: (topic, format) => format === 'linkedin_post'
    ? `Write a LinkedIn post (150–250 words) capitalising on momentum around "${topic}".
Reference real customer language to show you understand the trend. Position a point of view. End with a question that invites replies.`
    : `Write an outreach email (100–150 words) to a prospect who has shown interest in "${topic}".
Personalise using the customer snippets. One CTA, no pressure.`,

  competitor_mention: (topic, format) => format === 'linkedin_post'
    ? `Write a LinkedIn post (150–250 words) about the landscape around "${topic}" without naming competitors.
Use customer language to show you understand what buyers care about when evaluating options. Differentiate through point of view, not feature lists.`
    : `Write a comparison email (100–150 words) for a prospect evaluating "${topic}".
Focus on outcomes and customer language, not features. Honest, direct, no FUD.`,
}

export async function generateDraftFromSignal(
  signalId: string,
  format: ContentFormat,
  personaId?: string | null
): Promise<ContentActionState & { draftId?: string }> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const groqKey = await resolveGroqKey(result.workspaceId)
  if (!groqKey) {
    return { error: 'No Groq API key configured — add one in Settings or set GROQ_API_KEY.' }
  }

  // Load signal, author profile, and entity intelligence in parallel
  const [{ data: signal }, { data: authorProfile }, entityIntel, personaData] = await Promise.all([
    adminClient
      .from('signals')
      .select('*')
      .eq('id', signalId)
      .eq('workspace_id', result.workspaceId)
      .single(),
    adminClient
      .from('author_profiles')
      .select('display_name, role, voice_notes')
      .eq('workspace_id', result.workspaceId)
      .eq('user_id', result.userId)
      .single(),
    getEntityIntelligenceBlock(result.workspaceId, personaId),
    personaId
      ? adminClient.from('personas').select('name, description').eq('id', personaId).single()
      : Promise.resolve({ data: null }),
  ])
  const persona = personaData.data as { name: string; description: string | null } | null

  if (!signal) return { error: 'Signal not found' }

  // Load entity mentions for context (up to 8 snippets)
  const mentions: { snippet: string; document_id: string }[] = []
  if (signal.entity_id) {
    const { data: rows } = await adminClient
      .from('entity_mentions')
      .select('snippet, document_id')
      .eq('entity_id', signal.entity_id)
      .eq('workspace_id', result.workspaceId)
      .not('snippet', 'is', null)
      .order('confidence', { ascending: false })
      .limit(8)

    if (rows) mentions.push(...rows)
  }

  const snippetBlock = mentions.length > 0
    ? `Customer snippets (verbatim):\n${mentions.map((m, i) => `${i + 1}. "${m.snippet}"`).join('\n')}`
    : `No verbatim snippets available yet — generate based on the topic alone.`

  const userPrompt = SIGNAL_PROMPTS[signal.signal_type as SignalType]?.(signal.title, format)
    ?? `Write a ${format.replace('_', ' ')} about "${signal.title}" based on the following context.\n${snippetBlock}`

  const voiceContext = authorProfile?.voice_notes
    ? `\n\nAuthor voice profile (${authorProfile.display_name ?? 'the author'}${authorProfile.role ? `, ${authorProfile.role}` : ''}):\n${authorProfile.voice_notes}`
    : ''

  const personaContext = persona
    ? `\n\nTarget audience persona: ${persona.name}${persona.description ? ` — ${persona.description}` : ''}.\nWrite specifically for this persona. Use the language, concerns, and context that this persona has expressed in customer conversations.`
    : ''

  const systemPrompt = `You are a B2B content strategist ghostwriting for a SaaS practitioner. Your writing sounds like a thoughtful practitioner, not a marketer. Use plain language, avoid corporate jargon, and prioritise customer voice over brand voice.${voiceContext}${personaContext}${entityIntel}\n\n${snippetBlock}`

  let body: string
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
      }),
    })
    if (!res.ok) throw new Error(`Groq returned ${res.status}`)
    const data = await res.json()
    body = data.choices?.[0]?.message?.content ?? ''
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Groq API error' }
  }

  const title = `${signal.title} — ${format === 'linkedin_post' ? 'LinkedIn Post' : format === 'email_sequence' ? 'Email' : format}`

  const { data: draft, error: insertErr } = await adminClient
    .from('content_drafts')
    .insert({
      workspace_id: result.workspaceId,
      format,
      title,
      brief: { topic: signal.title, angle: signal.signal_type },
      body,
      status: 'draft',
    })
    .select('id')
    .single()

  if (insertErr || !draft) return { error: insertErr?.message ?? 'Failed to save draft' }

  // Link source documents from mentions
  const uniqueDocIds = [...new Set(mentions.map((m) => m.document_id))]
  if (uniqueDocIds.length > 0) {
    await adminClient.from('content_sources').insert(
      uniqueDocIds.map((docId) => ({ draft_id: draft.id, document_id: docId }))
    )
  }

  revalidatePath('/content')
  return { success: true, draftId: draft.id }
}

export async function generateDraftBody(
  draftId: string,
  personaId?: string | null
): Promise<{ body?: string; error?: string }> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const groqKey = await resolveGroqKey(result.workspaceId)
  if (!groqKey) {
    return { error: 'No Groq API key configured — add one in Settings or set GROQ_API_KEY.' }
  }

  const [{ data: draft }, { data: authorProfile }, { data: sources }, entityIntel, personaData] = await Promise.all([
    adminClient
      .from('content_drafts')
      .select('id, format, title, brief, author_profile_id')
      .eq('id', draftId)
      .eq('workspace_id', result.workspaceId)
      .single(),
    adminClient
      .from('author_profiles')
      .select('display_name, role, voice_notes')
      .eq('workspace_id', result.workspaceId)
      .eq('user_id', result.userId)
      .single(),
    adminClient
      .from('content_sources')
      .select('source_documents(title, content)')
      .eq('draft_id', draftId)
      .limit(5),
    getEntityIntelligenceBlock(result.workspaceId, personaId),
    personaId
      ? adminClient.from('personas').select('name, description').eq('id', personaId).single()
      : Promise.resolve({ data: null }),
  ])
  const persona = personaData.data as { name: string; description: string | null } | null

  if (!draft) return { error: 'Draft not found' }

  const brief = draft.brief as Brief
  const format = draft.format as ContentFormat

  const sourceContext = (sources ?? [])
    .map((s) => {
      const doc = s.source_documents as unknown as { title: string; content: string } | null
      return doc ? `— ${doc.title}: ${doc.content.slice(0, 500)}` : null
    })
    .filter(Boolean)
    .join('\n')

  const voiceContext = authorProfile?.voice_notes
    ? `\n\nAuthor voice (${authorProfile.display_name ?? 'the author'}${authorProfile.role ? `, ${authorProfile.role}` : ''}):\n${authorProfile.voice_notes}`
    : ''

  const formatLabel: Record<ContentFormat, string> = {
    linkedin_post:  'LinkedIn post (150–250 words)',
    email_sequence: 'cold outreach email (100–150 words)',
    blog_post:      'blog post introduction (300–500 words)',
    battle_card:    'competitive battle card (bullet points, 200–400 words)',
  }

  const personaContext = persona
    ? `\n\nTarget audience persona: ${persona.name}${persona.description ? ` — ${persona.description}` : ''}.\nWrite specifically for this persona using their language and concerns.`
    : ''

  const systemPrompt = `You are a B2B content strategist ghostwriting for a SaaS practitioner. Use plain language, avoid marketing jargon, and write in first person where appropriate.${voiceContext}${personaContext}${entityIntel}`

  const parts = [
    `Write a ${formatLabel[format] ?? format} about: "${brief.topic ?? draft.title}"`,
    brief.angle ? `Angle: ${brief.angle}` : null,
    brief.target_audience ? `Target audience: ${brief.target_audience}` : null,
    brief.key_points?.length ? `Key points to cover:\n${brief.key_points.map((p) => `- ${p}`).join('\n')}` : null,
    sourceContext ? `\nEvidence from linked sources:\n${sourceContext}` : null,
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 800,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: parts },
        ],
      }),
    })
    if (!res.ok) throw new Error(`Groq returned ${res.status}`)
    const data = await res.json()
    const body = data.choices?.[0]?.message?.content ?? ''
    return { body }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Groq API error' }
  }
}

// ─── Author profiles ──────────────────────────────────────────────────────────

export async function getAuthorProfile(): Promise<AuthorProfile | null> {
  const result = await requireWorkspace()
  if ('error' in result) return null

  const { data } = await adminClient
    .from('author_profiles')
    .select('*')
    .eq('workspace_id', result.workspaceId)
    .eq('user_id', result.userId)
    .single()

  return (data as AuthorProfile | null) ?? null
}

export async function getAuthorProfiles(): Promise<AuthorProfile[]> {
  const result = await requireWorkspace()
  if ('error' in result) return []

  const { data } = await adminClient
    .from('author_profiles')
    .select('*')
    .eq('workspace_id', result.workspaceId)
    .order('display_name')

  return (data ?? []) as AuthorProfile[]
}

export async function upsertAuthorProfile(
  state: ContentActionState,
  formData: FormData
): Promise<ContentActionState> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const display_name = (formData.get('display_name') as string)?.trim()
  const role         = (formData.get('role')         as string)?.trim() || null
  const voice_notes  = (formData.get('voice_notes')  as string)?.trim() || null

  if (!display_name) return { error: 'Display name is required' }

  const { error } = await adminClient
    .from('author_profiles')
    .upsert(
      {
        workspace_id: result.workspaceId,
        user_id:      result.userId,
        display_name,
        role,
        voice_notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,user_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}
