'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <p className="text-sm text-muted-foreground">Failed to load job offer. Please try again.</p>
      <button
        onClick={reset}
        className="text-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Retry
      </button>
    </div>
  )
}
