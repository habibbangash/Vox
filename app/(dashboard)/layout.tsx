import Link from 'next/link'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { getWorkspaceMembership } from '@/lib/supabase/dal'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: '⬡' },
  { href: '/sources', label: 'Sources', icon: '⟡' },
  { href: '/intelligence', label: 'Intelligence', icon: '◈' },
  { href: '/content', label: 'Content', icon: '⊞' },
]

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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r bg-card">
        {/* Logo */}
        <div className="px-4 py-5 border-b">
          <span className="text-xl font-bold tracking-tight">Vox</span>
        </div>

        {/* Workspace */}
        <div className="px-4 py-3 border-b">
          <p className="text-xs text-muted-foreground">Workspace</p>
          <p className="text-sm font-medium truncate">{workspace?.name ?? '—'}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-3 border-t">
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
            >
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
