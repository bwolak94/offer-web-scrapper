import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ListingCardImage } from './ListingCardImage'
import { ListingCardBody } from './ListingCardBody'
import type { ListingSummary } from '@/types'

interface ListingCardProps {
  listing:   ListingSummary
  priority?: boolean
}

export function ListingCard({ listing, priority = false }: ListingCardProps) {
  return (
    <Link href={`/listing/${listing.id}`} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <Card className="mb-2 flex min-h-[100px] overflow-hidden transition-shadow hover:shadow-md">
        <ListingCardImage src={listing.images[0] ?? null} alt={listing.title} priority={priority} />
        <CardContent className="flex flex-1 flex-col justify-between p-3">
          <ListingCardBody listing={listing} />
        </CardContent>
      </Card>
    </Link>
  )
}
