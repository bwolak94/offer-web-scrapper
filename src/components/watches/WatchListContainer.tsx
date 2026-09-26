'use client'

import { useQuery } from '@tanstack/react-query'
import { WatchList } from './WatchList'
import type { Watch } from '@/types'

// BE-08 returns { data: Watch[], total: number } — extract .data and deserialize dates.
type RawWatch = Omit<Watch, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}

async function fetchWatches(): Promise<Watch[]> {
  const res = await fetch('/api/watches')
  if (!res.ok) throw new Error('Failed to fetch watches')
  const { data }: { data: RawWatch[] } = await res.json()
  return data.map((w) => ({
    ...w,
    createdAt: new Date(w.createdAt),
    updatedAt: new Date(w.updatedAt),
  }))
}

export function WatchListContainer() {
  const { data: watches = [], isLoading, error } = useQuery({
    queryKey: ['watches'],
    queryFn: fetchWatches,
    staleTime: 0,
  })

  if (isLoading) return null
  if (error) return <p className="text-sm text-destructive">Failed to load watches</p>
  if (watches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No watches yet.{' '}
        <a href="/watches/new" className="underline">
          Create your first watch
        </a>{' '}
        to get notified about new listings.
      </div>
    )
  }

  return <WatchList watches={watches} />
}
