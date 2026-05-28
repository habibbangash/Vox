'use server'
import Anthropic from '@anthropic-ai/sdk'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

async function resolveAnthropicKey(workspaceId: string): Promise<string | null> {
  // Workspace-level key takes precedence over env var
  const { data: ws } = await adminClient
    .from('workspaces')
    .select('settings')
    .eq('id', workspaceId)
    .single()

  const settings = ws?.settings as Record<string, string> | null
  return settings?.['anthropic_api_key'] ?? process.env.ANTHROPIC_API_KEY ?? null
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
}

export type ContentActionState = { error?: string; success?: boolean; draftId?: string } | undefined

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    .order('document_count', { ascending: false })
    .limit(50)

  return (data ?? []) as Signal[]
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
  format: ContentFormat
): Promise<ContentActionState & { draftId?: string }> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const anthropicKey = await resolveAnthropicKey(result.workspaceId)
  if (!anthropicKey) {
    return { error: 'No Anthropic API key configured — add one in Settings or set ANTHROPIC_API_KEY.' }
  }

  // Load signal + author profile in parallel
  const [{ data: signal }, { data: authorProfile }] = await Promise.all([
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
  ])

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

  const systemPrompt = `You are a B2B content strategist ghostwriting for a SaaS practitioner. Your writing sounds like a thoughtful practitioner, not a marketer. Use plain language, avoid corporate jargon, and prioritise customer voice over brand voice.${voiceContext}\n\n${snippetBlock}`

  const client = new Anthropic({ apiKey: anthropicKey })

  let body: string
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    body = (message.content[0] as { type: string; text: string }).text ?? ''
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Claude API error' }
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
  draftId: string
): Promise<{ body?: string; error?: string }> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const anthropicKey = await resolveAnthropicKey(result.workspaceId)
  if (!anthropicKey) {
    return { error: 'No Anthropic API key configured — add one in Settings or set ANTHROPIC_API_KEY.' }
  }

  const [{ data: draft }, { data: authorProfile }, { data: sources }] = await Promise.all([
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
  ])

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

  const systemPrompt = `You are a B2B content strategist ghostwriting for a SaaS practitioner. Use plain language, avoid marketing jargon, and write in first person where appropriate.${voiceContext}`

  const parts = [
    `Write a ${formatLabel[format] ?? format} about: "${brief.topic ?? draft.title}"`,
    brief.angle ? `Angle: ${brief.angle}` : null,
    brief.target_audience ? `Target audience: ${brief.target_audience}` : null,
    brief.key_points?.length ? `Key points to cover:\n${brief.key_points.map((p) => `- ${p}`).join('\n')}` : null,
    sourceContext ? `\nEvidence from linked sources:\n${sourceContext}` : null,
  ].filter(Boolean).join('\n')

  const client = new Anthropic({ apiKey: anthropicKey })

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: parts }],
    })
    const body = (message.content[0] as { type: string; text: string }).text ?? ''
    return { body }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Claude API error' }
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
