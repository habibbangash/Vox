import { getAuthorProfile } from '@/app/actions/content'
import { AuthorProfileForm } from './_components/author-profile-form'

export default async function SettingsPage() {
  const profile = await getAuthorProfile()

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
      </div>
    </div>
  )
}
