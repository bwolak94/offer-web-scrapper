import { Skeleton } from '@/components/ui/skeleton'

export function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-[140px] w-full rounded-lg" />
      ))}
    </div>
  )
}
