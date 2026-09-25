import { Skeleton } from '@/components/ui/skeleton'

export function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap gap-3 rounded-lg border bg-card p-3">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-10 w-28" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-10 w-24" />
    </div>
  )
}
