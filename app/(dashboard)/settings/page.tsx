import { getAuthorProfile } from '@/app/actions/content'
import { getWorkspaceSettings } from '@/app/actions/workspace'
import { getTeamContext } from '@/app/actions/team'
import { AuthorProfileForm } from './_components/author-profile-form'
import { ApiKeyForm } from './_components/api-key-form'
import { TeamMembers } from './_components/team-members'

export default async function SettingsPage() {
  const [profile, wsSettings, teamCtx] = await Promise.all([
    getAuthorProfile(),
    getWorkspaceSettings(),
    getTeamContext(),
  ])

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your author profile and workspace preferences.
        </p>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-medium">Author profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your voice fingerprint for AI-generated content. The more specific, the more on-brand the output.
            </p>
          </div>
          <AuthorProfileForm profile={profile} />
        </section>

        <div className="border-t" />

        <section className="space-y-4">
          <div>
            <h2 className="text-base font-medium">AI / Anthropic API key</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Workspace-level key used for content generation and entity extraction. Overrides the server default.
            </p>
          </div>
          <ApiKeyForm hasKey={!!wsSettings.anthropic_api_key} />
        </section>

        <div className="border-t" />

        <section className="space-y-4">
          <div>
            <h2 className="text-base font-medium">Team members</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Invite teammates to collaborate in this workspace. Invite links expire after 7 days.
            </p>
          </div>
          {teamCtx ? (
            <TeamMembers
              members={teamCtx.members}
              invitations={teamCtx.invitations}
              currentUserId={teamCtx.currentUserId}
              currentUserRole={teamCtx.currentUserRole}
              appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
            />
          ) : (
            <p className="text-xs text-muted-foreground">Unable to load team data.</p>
          )}
        </section>
      </div>
    </div>
  )
}
