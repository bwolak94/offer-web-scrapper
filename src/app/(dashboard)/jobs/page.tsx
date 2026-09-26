import { Suspense } from 'react'
import { JobFilterBar } from '@/components/filters/JobFilterBar'
import { FilterBarSkeleton } from '@/components/filters/FilterBarSkeleton'
import { JobsContainer } from '@/components/jobs/JobsContainer'
import { ListSkeleton } from '@/components/listings/ListSkeleton'

export default function JobsPage() {
  return (
    <div className="flex h-full flex-col gap-4">
      {/*
        CRITICAL: JobFilterBar calls useSearchParams() — must be in Suspense.
        Same constraint as the real estate FilterBar.
      */}
      <Suspense fallback={<FilterBarSkeleton />}>
        <JobFilterBar />
      </Suspense>

      <Suspense fallback={<ListSkeleton />}>
        <JobsContainer />
      </Suspense>
    </div>
  )
}
