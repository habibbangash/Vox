'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { generateWebhookSecret } from '@/lib/sources/krisp'

export type SourceActionState = { error?: string; success?: boolean } | undefined

export async function connectKrisp(state: SourceActionState): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'No workspace found' }

  const { error } = await adminClient
    .from('source_connections')
    .insert({
      workspace_id: member.workspace_id,
      user_id: user.id,
      source_type: 'krisp',
      display_name: user.email ?? 'Krisp',
      status: 'active',
      webhook_secret: generateWebhookSecret(),
    })

  if (error) return { error: error.message }

  revalidatePath('/sources')
  return { success: true }
}

export async function disconnectSource(connectionId: string): Promise<SourceActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await adminClient
    .from('source_connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/sources')
  return { success: true }
}
