'use client'

import type { ErrorBoundaryProps } from '@/types'

export default function Error({ error, reset }: ErrorBoundaryProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <p className="text-muted-foreground">Failed to load listings: {error.message}</p>
      <button onClick={reset} className="text-sm underline">Retry</button>
    </div>
  )
}
