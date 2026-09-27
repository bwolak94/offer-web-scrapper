'use client'

import { useReducedMotion as useFramerReducedMotion } from 'framer-motion'

/** Returns true when the user prefers reduced motion. All Framer Motion
 *  wrappers use this to disable animations rather than just slow them down,
 *  which is required for vestibular disorder accessibility. */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false
}
