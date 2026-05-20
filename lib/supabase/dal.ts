import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from './server'
import { adminClient } from './admin'

export const verifySession = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return { user: user! }
})

export const getWorkspaceMembership = cache(async () => {
  const { user } = await verifySession()

  const { data } = await adminClient
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name, slug)')
    .eq('user_id', user.id)
    .single()

  return data ?? null
})
