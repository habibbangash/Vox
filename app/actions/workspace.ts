'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

async function requireOwner(): Promise<{ workspaceId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await adminClient
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'No workspace found' }
  if (member.role !== 'owner') return { error: 'Only the workspace owner can change these settings' }

  return { workspaceId: member.workspace_id }
}

export interface WorkspaceSettings {
  groq_api_key?: string
  resend_api_key?: string
  resend_from_name?: string
  resend_from_email?: string
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const { data: member } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return {}

  const { data: ws } = await adminClient
    .from('workspaces')
    .select('settings')
    .eq('id', member.workspace_id)
    .single()

  return (ws?.settings as WorkspaceSettings) ?? {}
}

export async function updateWorkspaceName(name: string): Promise<{ error?: string }> {
  const result = await requireOwner()
  if ('error' in result) return { error: result.error }

  const trimmed = name.trim()
  if (!trimmed || trimmed.length < 2) return { error: 'Name must be at least 2 characters' }
  if (trimmed.length > 60)           return { error: 'Name must be 60 characters or fewer' }

  const { error } = await adminClient
    .from('workspaces')
    .update({ name: trimmed })
    .eq('id', result.workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return {}
}

export async function saveGroqKey(
  key: string
): Promise<{ error?: string }> {
  const result = await requireOwner()
  if ('error' in result) return { error: result.error }

  const trimmed = key.trim()
  if (!trimmed.startsWith('gsk_')) {
    return { error: 'Key must start with gsk_' }
  }

  const { data: ws } = await adminClient
    .from('workspaces')
    .select('settings')
    .eq('id', result.workspaceId)
    .single()

  const settings = { ...((ws?.settings as WorkspaceSettings) ?? {}), groq_api_key: trimmed }

  const { error } = await adminClient
    .from('workspaces')
    .update({ settings })
    .eq('id', result.workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return {}
}

export async function testGroqKey(
  key: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` },
    })
    if (res.status === 401) return { valid: false, error: 'Invalid API key — double-check it on console.groq.com' }
    if (!res.ok)            return { valid: false, error: `Groq returned ${res.status}` }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Could not reach Groq — check your connection' }
  }
}

export async function removeGroqKey(): Promise<{ error?: string }> {
  const result = await requireOwner()
  if ('error' in result) return { error: result.error }

  const { data: ws } = await adminClient
    .from('workspaces')
    .select('settings')
    .eq('id', result.workspaceId)
    .single()

  const settings = { ...((ws?.settings as WorkspaceSettings) ?? {}) }
  delete settings.groq_api_key

  const { error } = await adminClient
    .from('workspaces')
    .update({ settings })
    .eq('id', result.workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return {}
}

export async function saveResendConfig(input: {
  apiKey: string
  fromName: string
  fromEmail: string
}): Promise<{ error?: string }> {
  const result = await requireOwner()
  if ('error' in result) return { error: result.error }

  const apiKey = input.apiKey.trim()
  const fromName = input.fromName.trim()
  const fromEmail = input.fromEmail.trim()

  if (!apiKey.startsWith('re_')) return { error: 'Resend API key must start with re_' }
  if (!fromEmail.includes('@')) return { error: 'Invalid from email address' }
  if (!fromName) return { error: 'From name is required' }

  const { data: ws } = await adminClient
    .from('workspaces')
    .select('settings')
    .eq('id', result.workspaceId)
    .single()

  const settings: WorkspaceSettings = {
    ...((ws?.settings as WorkspaceSettings) ?? {}),
    resend_api_key: apiKey,
    resend_from_name: fromName,
    resend_from_email: fromEmail,
  }

  const { error } = await adminClient
    .from('workspaces')
    .update({ settings })
    .eq('id', result.workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/sources')
  return {}
}

export async function removeResendConfig(): Promise<{ error?: string }> {
  const result = await requireOwner()
  if ('error' in result) return { error: result.error }

  const { data: ws } = await adminClient
    .from('workspaces')
    .select('settings')
    .eq('id', result.workspaceId)
    .single()

  const settings = { ...((ws?.settings as WorkspaceSettings) ?? {}) }
  delete settings.resend_api_key
  delete settings.resend_from_name
  delete settings.resend_from_email

  const { error } = await adminClient
    .from('workspaces')
    .update({ settings })
    .eq('id', result.workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/sources')
  return {}
}
