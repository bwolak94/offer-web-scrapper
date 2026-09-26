import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function WatchNotFound() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-center">
      <h2 className="text-lg font-semibold">Watch not found</h2>
      <p className="text-sm text-muted-foreground">
        This watch does not exist or has been deleted.
      </p>
      <Button render={<Link href="/watches" />} variant="outline" size="sm">
        Back to watches
      </Button>
    </div>
  )
}
