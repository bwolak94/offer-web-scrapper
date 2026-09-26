'use client'

import { useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface LoadMoreSentinelProps {
  onVisible: () => void
  isLoading: boolean
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
            <Skeleton key={i} className="h-[140px] w-full rounded-lg" />
          ))}
        </div>
      )}
    </div>
  )
}
