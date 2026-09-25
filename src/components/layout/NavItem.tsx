import Link from 'next/link'

interface NavItemProps {
  href:      string
  label:     string
  icon?:     React.ReactNode
  badge?:    number
  isActive?: boolean
}

export function NavItem({ href, label, icon, badge, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 rounded-md mx-2 px-3 py-2 text-sm transition-colors
        ${isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        }
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
