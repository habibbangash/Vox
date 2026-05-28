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
  anthropic_api_key?: string
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

export async function saveAnthropicKey(
  key: string
): Promise<{ error?: string }> {
  const result = await requireOwner()
  if ('error' in result) return { error: result.error }

  const trimmed = key.trim()
  if (!trimmed.startsWith('sk-ant-')) {
    return { error: 'Key must start with sk-ant-' }
  }

  const { data: ws } = await adminClient
    .from('workspaces')
    .select('settings')
    .eq('id', result.workspaceId)
    .single()

  const settings = { ...((ws?.settings as WorkspaceSettings) ?? {}), anthropic_api_key: trimmed }

  const { error } = await adminClient
    .from('workspaces')
    .update({ settings })
    .eq('id', result.workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return {}
}

export async function removeAnthropicKey(): Promise<{ error?: string }> {
  const result = await requireOwner()
  if ('error' in result) return { error: result.error }

  const { data: ws } = await adminClient
    .from('workspaces')
    .select('settings')
    .eq('id', result.workspaceId)
    .single()

  const settings = { ...((ws?.settings as WorkspaceSettings) ?? {}) }
  delete settings.anthropic_api_key

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
