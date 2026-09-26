'use client'

export default function EditWatchError() {
  return (
    <div className="mx-auto max-w-2xl space-y-2">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        Could not load this watch. Please go back and try again.
      </p>
    </div>
  )
}
