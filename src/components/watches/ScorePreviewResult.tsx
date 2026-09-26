'use client'

import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import type { WatchType, ScoreResponse } from '@/types'

interface ScorePreviewResultProps {
  criteria:  string
  watchType: WatchType
}

async function fetchPreviewScore(
  criteria: string,
  watchType: WatchType,
): Promise<ScoreResponse> {
  const res = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: watchType, criteria, preview: true }),
  })
  if (!res.ok) throw new Error('Failed to get score preview')
  return res.json()
}

export function ScorePreviewResult({ criteria, watchType }: ScorePreviewResultProps) {
  const { data, isLoading, error } = useQuery<ScoreResponse, Error>({
    queryKey:  ['score-preview', watchType, criteria] as const,
    queryFn:   () => fetchPreviewScore(criteria, watchType),
    staleTime: Infinity,
    gcTime:    60_000,
    enabled:   Boolean(criteria.trim()),
  })

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Scoring a sample listing…</p>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-xs text-destructive">
        Could not load preview: {error.message}
      </p>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Sample score</p>
        <ScoreBadge score={data.score} size="md" showLabel />
      </div>
      {data.reasoning && (
        <p className="text-xs leading-relaxed text-muted-foreground">{data.reasoning}</p>
      )}
    </div>
  )
}
