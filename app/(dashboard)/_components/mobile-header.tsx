'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const navItems = [
  { href: '/dashboard',    label: 'Home',         icon: '⬡' },
  { href: '/sources',      label: 'Sources',      icon: '⟡' },
  { href: '/intelligence', label: 'Intelligence', icon: '◈' },
  { href: '/content',      label: 'Content',      icon: '⊞' },
  { href: '/analytics',    label: 'Analytics',    icon: '▲' },
  { href: '/settings',     label: 'Settings',     icon: '⚙' },
]

interface MobileHeaderProps {
  workspaceName: string
}

export function MobileHeader({ workspaceName }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Top bar */}
      <header className="flex sm:hidden items-center justify-between border-b bg-card px-4 h-12 shrink-0">
        <span className="text-lg font-bold tracking-tight">Vox</span>
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-card border-r shadow-xl transition-transform duration-200 sm:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b shrink-0">
          <span className="text-lg font-bold tracking-tight">Vox</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Workspace */}
        <div className="px-4 py-3 border-b">
          <p className="text-xs text-muted-foreground">Workspace</p>
          <p className="text-sm font-medium truncate">{workspaceName}</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
