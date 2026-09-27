'use client'

import { AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { FadeIn } from '@/components/motion/FadeIn'

/** Wraps page children in AnimatePresence so route changes get a
 *  fade + slide-up transition. `initial={false}` skips the enter
 *  animation on the very first render to avoid a flash on hard load. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <FadeIn key={pathname} className="h-full">
        {children}
      </FadeIn>
    </AnimatePresence>
  )
}
