import { PriceTag } from '@/components/ui/PriceTag'
import { MetaTags } from '@/components/ui/MetaTags'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { MapPin, Ruler, LayoutGrid } from 'lucide-react'
import type { ListingSummary } from '@/types'

interface ListingCardBodyProps {
  listing: ListingSummary
}

export function ListingCardBody({ listing }: ListingCardBodyProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium leading-tight">{listing.title}</p>
        <ScoreBadge score={listing.aiScore} size="sm" />
      </div>
      <div className="mt-auto flex items-end justify-between">
        <div className="space-y-1">
          <PriceTag price={listing.price} areaM2={listing.areaM2} perM2 />
          <MetaTags
            items={[
              ...(listing.areaM2 != null ? [{ icon: <Ruler size={12} />, label: `${listing.areaM2} m²` }] : []),
              ...(listing.rooms  != null ? [{ icon: <LayoutGrid size={12} />, label: `${listing.rooms} rooms` }] : []),
              ...(listing.location != null ? [{ icon: <MapPin size={12} />, label: listing.location }] : []),
            ]}
          />
        </div>
        <SourceBadge source={listing.source} />
      </div>
    </>
  )
}
