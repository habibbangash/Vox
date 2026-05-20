'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

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

export interface Signal {
  id:          string
  topic:       string
  description: string
  source_count: number
  stub:        true
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
  // Stub — real detection unlocks when extraction pipeline is live
  return []
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
