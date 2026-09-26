import type { Snapshot } from '@/types'

interface SnapshotTimelineProps {
  snapshots: Snapshot[]
}

export function SnapshotTimeline({ snapshots }: SnapshotTimelineProps) {
  return (
    <div className="space-y-4">
      {snapshots.map((snap, idx) => (
        <div key={snap.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-background" />
            {idx < snapshots.length - 1 && (
              <div className="mt-1 h-full w-px bg-border" />
            )}
          </div>
          <div className="pb-4">
            <p className="text-xs text-muted-foreground">
              {new Date(snap.snappedAt).toLocaleString('pl-PL')}
            </p>
            {snap.diff.fields.map((f, i) => (
              <div key={i} className="mt-1 text-sm">
                <span className="font-medium">{f.field}:</span>{' '}
                <span className="text-red-500 line-through">{String(f.oldValue ?? '—')}</span>
                {' → '}
                <span className="text-green-700">{String(f.newValue ?? '—')}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
