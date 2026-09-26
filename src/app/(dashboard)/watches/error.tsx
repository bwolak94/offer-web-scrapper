'use client'

export default function WatchesError() {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        Could not load your watches. Please refresh the page.
      </p>
    </div>
  )
}
