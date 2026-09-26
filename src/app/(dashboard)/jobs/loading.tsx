import { FilterBarSkeleton } from '@/components/filters/FilterBarSkeleton'
import { ListSkeleton } from '@/components/listings/ListSkeleton'

export default function Loading() {
  return (
    <div className="flex h-full flex-col gap-4">
      <FilterBarSkeleton />
      <ListSkeleton />
    </div>
  )
}
