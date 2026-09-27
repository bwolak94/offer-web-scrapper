import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ListingCardImage } from './ListingCardImage'
import { ListingCardBody } from './ListingCardBody'
import type { ListingSummary } from '@/types'

interface ListingCardProps {
  listing:   ListingSummary
  priority?: boolean
}

function getScoreBorderColor(score: number | null): string {
  if (score === null) return 'var(--color-border)'
  if (score >= 70) return 'var(--color-score-high)'
  if (score >= 40) return 'var(--color-score-mid)'
  return 'var(--color-score-low)'
}

export function ListingCard({ listing, priority = false }: ListingCardProps) {
  return (
    <Link href={`/listing/${listing.id}`} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <Card
        className="mb-2 flex min-h-[100px] overflow-hidden border-l-4 shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
        style={{ borderLeftColor: getScoreBorderColor(listing.aiScore) }}
      >
        <ListingCardImage src={listing.images[0] ?? null} alt={listing.title} priority={priority} />
        <CardContent className="flex flex-1 flex-col justify-between p-4">
          <ListingCardBody listing={listing} />
        </CardContent>
      </Card>
    </Link>
  )
}
