'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export type OnboardingState = { error?: string } | undefined

export async function createWorkspace(
  state: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = (formData.get('name') as string).trim()
  const slug = (formData.get('slug') as string).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')

  const { data: workspace, error: wsError } = await adminClient
    .from('workspaces')
    .insert({ name, slug })
    .select()
    .single()

  if (wsError) return { error: wsError.message }

  const { error: memberError } = await adminClient
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'owner' })

  if (memberError) return { error: memberError.message }

  redirect('/onboarding/profile')
}

export async function saveCompanyProfile(
  state: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await adminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/onboarding/workspace')

  const personasRaw = formData.get('target_personas') as string
  const target_personas = personasRaw
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)

  const { error } = await adminClient.from('company_profiles').upsert({
    workspace_id: member.workspace_id,
    system_prompt: formData.get('system_prompt') as string,
    icp_description: formData.get('icp_description') as string,
    target_personas,
    updated_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }

  redirect('/dashboard')
}
