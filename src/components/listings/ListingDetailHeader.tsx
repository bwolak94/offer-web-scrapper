import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { PriceTag } from '@/components/ui/PriceTag'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { ListingPublic } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  sale:       'For Sale',
  rent_long:  'Long-term Rent',
  rent_short: 'Short-term Rent',
}

export function ListingDetailHeader({ listing }: { listing: ListingPublic }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold leading-tight">{listing.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {CATEGORY_LABELS[listing.category] ?? listing.category}
            </Badge>
            <SourceBadge source={listing.source} />
          </div>
        </div>
        <ScoreBadge score={listing.aiScore} size="lg" showLabel />
      </div>
      <PriceTag
        price={listing.price}
        currency={listing.currency}
        areaM2={listing.areaM2}
        perM2
      />
      <Separator />
    </div>
  )
}
