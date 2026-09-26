import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { WatchListContainer } from '@/components/watches/WatchListContainer'

export default function WatchesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Watches</h1>
        <Button render={<Link href="/watches/new" />} size="sm">
          New Watch
        </Button>
      </div>

      {/*
        Suspense here is a streaming SSR optimisation: the server renders
        WatchListSkeleton immediately while the client-side useQuery fetches.
        Unlike FilterBar (which uses useSearchParams), this is NOT a hard
        Next.js 15 requirement — it is a performance enhancement.
      */}
      <Suspense fallback={<WatchListSkeleton />}>
        <WatchListContainer />
      </Suspense>
    </div>
  )
}

function WatchListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  )
}
