'use client'

import { useEffect, useRef } from 'react'

interface LoadMoreSentinelProps {
  onVisible: () => void
  isLoading: boolean
}

function ShimmerCard() {
  return (
    <div className="relative h-[140px] w-full overflow-hidden rounded-xl border border-border bg-muted">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, oklch(0.99 0.02 265 / 0.7) 50%, transparent 100%)',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }}
      />
    </div>
  )
}

export function LoadMoreSentinel({ onVisible, isLoading }: LoadMoreSentinelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isFetchingRef = useRef(false)

  useEffect(() => {
    isFetchingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingRef.current) {
          isFetchingRef.current = true
          onVisible()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onVisible])

  return (
    <div ref={ref} className="py-4">
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <ShimmerCard key={i} />
          ))}
        </div>
      )}
    </div>
  )
}
