'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface SlideUpProps {
  children:  React.ReactNode
  className?: string
}

/** Slide-up card entry variant — must be a direct child of StaggerList
 *  so the parent `staggerChildren` timing applies. */
export function SlideUp({ children, className }: SlideUpProps) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className={className}
      variants={{
        hidden:  { opacity: 0, y: reduced ? 0 : 16 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{
        duration: reduced ? 0 : 0.35,
        ease:     [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
