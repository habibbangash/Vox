import { verifySession, getWorkspaceMembership } from '@/lib/supabase/dal'

export default async function DashboardPage() {
  const { user } = await verifySession()
  const membership = await getWorkspaceMembership()
  const workspace = membership?.workspaces as unknown as { name: string } | null

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {workspace ? `${workspace.name}` : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PhaseCard
          step="Phase 2"
          title="Connect sources"
          description="Link your meeting tool, Slack channels, and RSS feeds so Vox can start listening."
          href="/dashboard/sources"
          status="next"
        />
        <PhaseCard
          step="Phase 3"
          title="Build intelligence"
          description="Vox extracts personas, pain points, and topics from your conversations."
          href="/dashboard/intelligence"
          status="locked"
        />
        <PhaseCard
          step="Phase 4"
          title="Generate content"
          description="Turn your knowledge graph into LinkedIn posts, blog briefs, and email sequences."
          href="/dashboard/content"
          status="locked"
        />
      </div>
    </div>
  )
}

function PhaseCard({
  step,
  title,
  description,
  href,
  status,
}: {
  step: string
  title: string
  description: string
  href: string
  status: 'next' | 'locked'
}) {
  return (
    <div className={`rounded-lg border p-5 ${status === 'locked' ? 'opacity-50' : ''}`}>
      <p className="text-xs font-medium text-muted-foreground mb-1">{step}</p>
      <h3 className="font-medium mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
