import { Skeleton } from '@/components/ui/skeleton'

export default function EditWatchLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
