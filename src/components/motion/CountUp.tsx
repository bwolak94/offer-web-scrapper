'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface CountUpProps {
  value:     number
  duration?: number
  className?: string
}

/** Animates a number from 0 to `value` using an ease-out-expo curve.
 *  Used inside ScoreBadge to animate the score number alongside the SVG arc. */
export function CountUp({ value, duration = 0.8, className }: CountUpProps) {
  const reduced                  = useReducedMotion()
  const [displayed, setDisplayed] = useState(reduced ? value : 0)
  const rafRef                   = useRef<number | null>(null)

  useEffect(() => {
    if (reduced) {
      // Wrap in rAF to avoid synchronous setState inside an effect body
      const raf = requestAnimationFrame(() => setDisplayed(value))
      return () => cancelAnimationFrame(raf)
    }

    const startTime  = performance.now()
    const durationMs = duration * 1000

    function tick(now: number) {
      const elapsed  = now - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      // ease-out-expo
      const eased    = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplayed(Math.round(value * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [value, duration, reduced])

  return <span className={className}>{displayed}</span>
}
