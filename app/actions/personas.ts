'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export interface Persona {
  id:           string
  workspace_id: string
  name:         string
  description:  string | null
  keywords:     string[]
  color:        string
  created_at:   string
  updated_at:   string
}

export type PersonaActionState = { error?: string; success?: boolean; personaId?: string } | undefined

async function requireWorkspace() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!data) return { error: 'No workspace' }
  return { userId: user.id, workspaceId: data.workspace_id }
}

export async function getPersonas(): Promise<Persona[]> {
  const result = await requireWorkspace()
  if ('error' in result) return []

  const { data } = await adminClient
    .from('personas')
    .select('*')
    .eq('workspace_id', result.workspaceId)
    .order('name')

  return (data ?? []) as Persona[]
}

export async function createPersona(
  state: PersonaActionState,
  formData: FormData
): Promise<PersonaActionState> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const name        = (formData.get('name')        as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const keywordsRaw = (formData.get('keywords')    as string)?.trim()
  const color       = (formData.get('color')       as string)?.trim() || '#6366f1'

  if (!name) return { error: 'Name is required' }

  const keywords = keywordsRaw
    ? keywordsRaw.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
    : []

  const { data, error } = await adminClient
    .from('personas')
    .insert({ workspace_id: result.workspaceId, name, description, keywords, color })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Auto-tag existing documents if keywords provided
  if (keywords.length > 0) {
    await adminClient.rpc('auto_tag_documents_for_persona', {
      p_persona_id: data.id,
      p_keywords:   keywords,
    })
  }

  revalidatePath('/settings')
  revalidatePath('/content')
  return { success: true, personaId: data.id }
}

export async function updatePersona(
  personaId: string,
  patch: Partial<Pick<Persona, 'name' | 'description' | 'keywords' | 'color'>>
): Promise<PersonaActionState> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const { error } = await adminClient
    .from('personas')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', personaId)
    .eq('workspace_id', result.workspaceId)

  if (error) return { error: error.message }

  // Re-run auto-tagging if keywords changed
  if (patch.keywords) {
    await adminClient.rpc('auto_tag_documents_for_persona', {
      p_persona_id: personaId,
      p_keywords:   patch.keywords,
    })
  }

  revalidatePath('/settings')
  revalidatePath('/content')
  return { success: true }
}

export async function deletePersona(personaId: string): Promise<PersonaActionState> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const { error } = await adminClient
    .from('personas')
    .delete()
    .eq('id', personaId)
    .eq('workspace_id', result.workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/content')
  return { success: true }
}

export async function retagPersona(personaId: string): Promise<{ tagged?: number; error?: string }> {
  const result = await requireWorkspace()
  if ('error' in result) return { error: result.error }

  const { data: persona } = await adminClient
    .from('personas')
    .select('keywords')
    .eq('id', personaId)
    .eq('workspace_id', result.workspaceId)
    .single()

  if (!persona) return { error: 'Persona not found' }

  const { data: tagged, error } = await adminClient.rpc('auto_tag_documents_for_persona', {
    p_persona_id: personaId,
    p_keywords:   persona.keywords,
  })

  if (error) return { error: error.message }

  revalidatePath('/content')
  return { tagged: tagged as number }
}
