'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface FadeInProps {
  children:  React.ReactNode
  className?: string
  delay?:    number
  duration?: number
}

/** Fade + slight slide-up enter. Use for page sections and route entries. */
export function FadeIn({ children, className, delay = 0, duration = 0.35 }: FadeInProps) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : 8 }}
      transition={{
        duration: reduced ? 0 : duration,
        delay:    reduced ? 0 : delay,
        ease:     [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
