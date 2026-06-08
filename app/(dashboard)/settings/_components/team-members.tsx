'use client'
import { useState, useTransition } from 'react'
import { UserPlus, Copy, Check, Trash2, Loader2, Link2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createInvitation, revokeInvitation, removeMember, type TeamMember, type Invitation } from '@/app/actions/team'

const ROLE_STYLE: Record<string, string> = {
  owner:  'bg-violet-500/10 text-violet-600',
  admin:  'bg-blue-500/10 text-blue-600',
  member: 'bg-muted text-muted-foreground',
}

interface TeamMembersProps {
  members:     TeamMember[]
  invitations: Invitation[]
  currentUserId: string
  currentUserRole: string
  appUrl: string
}

export function TeamMembers({ members, invitations, currentUserId, currentUserRole, appUrl }: TeamMembersProps) {
  const [email,       setEmail]       = useState('')
  const [newToken,    setNewToken]    = useState<string | null>(null)
  const [copied,      setCopied]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [isInviting,  startInvite]    = useTransition()
  const [removingId,  setRemovingId]  = useState<string | null>(null)
  const [revokingId,  setRevokingId]  = useState<string | null>(null)

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  function inviteLink(token: string) {
    return `${appUrl}/invite/${token}`
  }

  function handleCopyLink(token: string) {
    navigator.clipboard.writeText(inviteLink(token)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleInvite() {
    setError(null)
    setNewToken(null)
    startInvite(async () => {
      const result = await createInvitation(email.trim() || null)
      if (result.error) {
        setError(result.error)
      } else if (result.token) {
        setNewToken(result.token)
        setEmail('')
      }
    })
  }

  async function handleRevoke(id: string) {
    setRevokingId(id)
    await revokeInvitation(id)
    setRevokingId(null)
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this member from the workspace?')) return
    setRemovingId(userId)
    await removeMember(userId)
    setRemovingId(null)
  }

  return (
    <div className="space-y-5">
      {/* Members list */}
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {(m.display_name ?? m.email ?? '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{m.display_name ?? m.email ?? 'Unknown'}</p>
                {m.display_name && m.email && (
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLE[m.role] ?? ROLE_STYLE.member}`}>
                {m.role}
              </span>
              {canManage && m.user_id !== currentUserId && m.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(m.user_id)}
                  disabled={removingId === m.user_id}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  {removingId === m.user_id
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <Trash2 className="size-3.5" />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending invites</p>
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border border-dashed bg-muted/20 px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground truncate">
                  {inv.email ?? 'Anyone with link'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  onClick={() => handleCopyLink(inv.token)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Link2 className="size-3.5" /> Copy link
                </button>
                {canManage && (
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    disabled={revokingId === inv.id}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    {revokingId === inv.id
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <Trash2 className="size-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New invite generated */}
      {newToken && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 space-y-2">
          <p className="text-xs font-medium text-green-600">Invite link ready — share it privately</p>
          <div className="flex gap-2">
            <Input
              value={inviteLink(newToken)}
              readOnly
              className="h-8 text-xs font-mono bg-background"
            />
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-8 px-2.5"
              onClick={() => handleCopyLink(newToken)}
            >
              {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Expires in 7 days. Anyone with the link can join.</p>
        </div>
      )}

      {/* Invite form */}
      {canManage && (
        <div className="space-y-1.5">
          <Label className="text-xs">Invite by email (optional)</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleInvite())}
              placeholder="teammate@company.com or leave blank for link invite"
              className="h-9 text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleInvite}
              disabled={isInviting}
              className="shrink-0"
            >
              {isInviting
                ? <Loader2 className="size-3.5 animate-spin" />
                : <><UserPlus className="size-3.5 mr-1.5" /> Invite</>}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-destructive rounded bg-destructive/10 px-2 py-1">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Leave email blank to generate a generic link. Invites expire after 7 days.
          </p>
        </div>
      )}
    </div>
  )
}
