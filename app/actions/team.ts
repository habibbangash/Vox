'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

async function requireWorkspaceMember(): Promise<
  { workspaceId: string; userId: string; role: string } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await adminClient
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'No workspace found' }
  return { workspaceId: member.workspace_id, userId: user.id, role: member.role }
}

export interface TeamMember {
  user_id: string
  role: string
  joined_at: string
  email: string | null
  display_name: string | null
}

export interface Invitation {
  id: string
  email: string | null
  token: string
  role: string
  status: string
  expires_at: string
  created_at: string
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const result = await requireWorkspaceMember()
  if ('error' in result) return []

  const { data } = await adminClient
    .from('workspace_members')
    .select('user_id, role, joined_at')
    .eq('workspace_id', result.workspaceId)
    .order('joined_at')

  if (!data?.length) return []

  // Fetch user emails from auth.users via admin
  const members: TeamMember[] = await Promise.all(
    data.map(async (m) => {
      const { data: profile } = await adminClient
        .from('author_profiles')
        .select('display_name')
        .eq('workspace_id', result.workspaceId)
        .eq('user_id', m.user_id)
        .single()

      // Get email from auth admin API
      const { data: authUser } = await adminClient.auth.admin.getUserById(m.user_id)

      return {
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        email: authUser.user?.email ?? null,
        display_name: (profile as { display_name?: string } | null)?.display_name ?? null,
      }
    })
  )

  return members
}

export async function listInvitations(): Promise<Invitation[]> {
  const result = await requireWorkspaceMember()
  if ('error' in result) return []

  const { data } = await adminClient
    .from('workspace_invitations')
    .select('id, email, token, role, status, expires_at, created_at')
    .eq('workspace_id', result.workspaceId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return (data ?? []) as Invitation[]
}

export async function createInvitation(
  email: string | null
): Promise<{ error?: string; token?: string }> {
  const result = await requireWorkspaceMember()
  if ('error' in result) return { error: result.error }
  if (result.role !== 'owner' && result.role !== 'admin') {
    return { error: 'Only owners and admins can invite members' }
  }

  const { data, error } = await adminClient
    .from('workspace_invitations')
    .insert({
      workspace_id: result.workspaceId,
      email: email || null,
      invited_by: result.userId,
      role: 'member',
    })
    .select('token')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to create invitation' }

  revalidatePath('/settings')
  return { token: data.token as string }
}

export async function revokeInvitation(
  invitationId: string
): Promise<{ error?: string }> {
  const result = await requireWorkspaceMember()
  if ('error' in result) return { error: result.error }
  if (result.role !== 'owner' && result.role !== 'admin') {
    return { error: 'Only owners and admins can revoke invitations' }
  }

  const { error } = await adminClient
    .from('workspace_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('workspace_id', result.workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return {}
}

export async function removeMember(
  userId: string
): Promise<{ error?: string }> {
  const result = await requireWorkspaceMember()
  if ('error' in result) return { error: result.error }
  if (result.role !== 'owner') return { error: 'Only the owner can remove members' }
  if (userId === result.userId) return { error: 'Cannot remove yourself' }

  const { error } = await adminClient
    .from('workspace_members')
    .delete()
    .eq('workspace_id', result.workspaceId)
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return {}
}

export async function acceptInvitation(
  token: string
): Promise<{ error?: string; workspaceId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: inv } = await adminClient
    .from('workspace_invitations')
    .select('id, workspace_id, role, email, status, expires_at')
    .eq('token', token)
    .single()

  if (!inv) return { error: 'Invalid invitation link' }
  if (inv.status !== 'pending') return { error: 'This invitation has already been used or revoked' }
  if (new Date(inv.expires_at) < new Date()) return { error: 'This invitation has expired' }
  if (inv.email && inv.email !== user.email) {
    return { error: `This invitation is for ${inv.email}` }
  }

  // Check if already a member
  const { data: existing } = await adminClient
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', inv.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await adminClient.from('workspace_members').insert({
      workspace_id: inv.workspace_id,
      user_id: user.id,
      role: inv.role,
      joined_at: new Date().toISOString(),
    })
  }

  await adminClient
    .from('workspace_invitations')
    .update({ status: 'accepted' })
    .eq('id', inv.id)

  return { workspaceId: inv.workspace_id }
}

export interface TeamContext {
  members:         TeamMember[]
  invitations:     Invitation[]
  currentUserId:   string
  currentUserRole: string
}

export async function getTeamContext(): Promise<TeamContext | null> {
  const result = await requireWorkspaceMember()
  if ('error' in result) return null

  const [members, invitations] = await Promise.all([
    listTeamMembers(),
    listInvitations(),
  ])

  return {
    members,
    invitations,
    currentUserId:   result.userId,
    currentUserRole: result.role,
  }
}
