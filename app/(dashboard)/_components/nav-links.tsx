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
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
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
  )
}
