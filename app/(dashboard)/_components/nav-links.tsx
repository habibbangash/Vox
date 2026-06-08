'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard',    label: 'Home',         icon: '⬡' },
  { href: '/sources',      label: 'Sources',      icon: '⟡' },
  { href: '/intelligence', label: 'Intelligence', icon: '◈' },
  { href: '/content',      label: 'Content',      icon: '⊞' },
  { href: '/analytics',    label: 'Analytics',    icon: '▲' },
  { href: '/settings',     label: 'Settings',     icon: '⚙' },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5">
      {navItems.map((item) => {
        const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 py-1.5 text-sm transition-colors ${
              active
                ? 'pl-[9px] border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-primary font-semibold rounded-r-md'
                : 'pl-3 border-l-[3px] border-transparent text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
