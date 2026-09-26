import React from 'react'
import { Ruler, LayoutGrid, MapPin, CalendarDays, RefreshCw } from 'lucide-react'
import type { ListingPublic } from '@/types'

type MetaItem = { label: string; value: string; icon: React.JSX.Element }

export function ListingMetaGrid({ listing }: { listing: ListingPublic }) {
  const items: MetaItem[] = [
    listing.areaM2   != null ? { label: 'Area',        value: `${listing.areaM2} m²`,                          icon: <Ruler size={14} /> }        : null,
    listing.rooms    != null ? { label: 'Rooms',        value: String(listing.rooms),                            icon: <LayoutGrid size={14} /> }   : null,
    listing.location != null ? { label: 'Location',     value: listing.location,                                 icon: <MapPin size={14} /> }       : null,
    { label: 'Scraped',      value: new Date(listing.scrapedAt).toLocaleDateString('pl-PL'),  icon: <CalendarDays size={14} /> },
    { label: 'Last update',  value: new Date(listing.updatedAt).toLocaleDateString('pl-PL'),  icon: <RefreshCw size={14} /> },
  ].filter((x): x is MetaItem => x !== null)

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-start gap-2">
          <span className="mt-0.5 text-muted-foreground">{item.icon}</span>
          <div>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-sm font-medium">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
