import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-72 w-full rounded-lg" />
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
