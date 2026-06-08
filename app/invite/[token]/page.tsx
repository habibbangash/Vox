import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { acceptInvitation } from '@/app/actions/team'
import Link from 'next/link'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">You&apos;ve been invited to Vox</h1>
            <p className="text-sm text-muted-foreground">
              Sign in or create an account to accept this invitation.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href={`/login?next=/invite/${token}`}
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              Sign in
            </Link>
            <Link
              href={`/signup?next=/invite/${token}`}
              className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const result = await acceptInvitation(token)

  if (!result.error) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Invitation problem</h1>
          <p className="text-sm text-muted-foreground">{result.error}</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
