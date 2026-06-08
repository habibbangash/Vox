import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { getWorkspaceMembership } from '@/lib/supabase/dal'
import { Button } from '@/components/ui/button'
import { NavLinks } from './_components/nav-links'
import { MobileHeader } from './_components/mobile-header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const membership = await getWorkspaceMembership()

  // If user is authenticated but has no workspace, push them to onboarding
  if (!membership) {
    redirect('/onboarding/workspace')
  }

  const workspace = membership.workspaces as unknown as { name: string; slug: string } | null

  return (
    <div className="flex flex-col sm:flex-row h-screen overflow-hidden bg-background">
      {/* Mobile top bar + slide-in drawer */}
      <MobileHeader workspaceName={workspace?.name ?? '—'} />

      {/* Sidebar — hidden on mobile */}
      <aside className="hidden sm:flex w-56 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-sidebar-border">
          <span className="text-xl font-bold tracking-tight text-sidebar-foreground font-heading">Vox</span>
        </div>

        {/* Workspace */}
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60">Workspace</p>
          <p className="text-sm font-medium truncate text-sidebar-foreground">{workspace?.name ?? '—'}</p>
        </div>

        {/* Navigation */}
        <NavLinks />

        {/* Logout */}
        <div className="px-2 py-3 border-t border-sidebar-border">
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
    </div>
  )
}
