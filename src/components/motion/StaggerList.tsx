'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface StaggerListProps {
  children:     React.ReactNode
  className?:   string
  staggerDelay?: number
}

/** Wraps a list container and staggers its SlideUp children on mount. */
export function StaggerList({ children, className, staggerDelay = 0.05 }: StaggerListProps) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden:  {},
        visible: {
          transition: {
            staggerChildren: reduced ? 0 : staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
