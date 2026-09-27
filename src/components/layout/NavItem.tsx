'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface NavItemProps {
  href:      string
  label:     string
  icon?:     React.ReactNode
  badge?:    number
  isActive?: boolean
}

export function NavItem({ href, label, icon, badge, isActive }: NavItemProps) {
  const reduced = useReducedMotion()

  return (
    <Link
      href={href}
      className={`
        relative flex items-center gap-3 rounded-md mx-2 px-3 py-2 text-sm transition-colors
        ${isActive
          ? 'text-primary font-semibold'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        }
      `}
    >
      {isActive && (
        <motion.span
          layoutId="nav-pill"
          aria-hidden="true"
          className="absolute inset-0 rounded-md bg-primary/10"
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      {icon && <span className="relative z-10 shrink-0">{icon}</span>}
      <span className="relative z-10 flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="relative z-10 ml-auto rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
