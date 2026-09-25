'use client'

import { usePathname } from 'next/navigation'
import { Home, Briefcase, Eye, Building2 } from 'lucide-react'
import { NavItem } from './NavItem'

interface NavItemConfig {
  href:  string
  label: string
  icon:  React.ReactNode
}

interface NavGroup {
  group: string
  items: NavItemConfig[]
}

const NAV_ITEMS: NavGroup[] = [
  {
    group: 'Real Estate',
    items: [
      { href: '/real-estate/sale',       label: 'For Sale',    icon: <Home size={16} /> },
      { href: '/real-estate/rent-long',  label: 'Long Rent',   icon: <Building2 size={16} /> },
      { href: '/real-estate/rent-short', label: 'Short Rent',  icon: <Building2 size={16} /> },
    ],
  },
  {
    group: 'Jobs',
    items: [
      { href: '/jobs', label: 'Job Offers', icon: <Briefcase size={16} /> },
    ],
  },
  {
    group: 'Watches',
    items: [
      { href: '/watches', label: 'My Watches', icon: <Eye size={16} /> },
    ],
  },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 overflow-y-auto py-2">
      {NAV_ITEMS.map((group) => (
        <div key={group.group} className="mb-4">
          <p className="px-4 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {group.group}
          </p>
          {group.items.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathname.startsWith(item.href)}
            />
          ))}
        </div>
      ))}
    </nav>
  )
}
