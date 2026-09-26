import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageGallery } from '@/components/listings/ImageGallery'
import { ListingDetailHeader } from '@/components/listings/ListingDetailHeader'
import { ListingMetaGrid } from '@/components/listings/ListingMetaGrid'
import { SnapshotTimeline } from '@/components/listings/SnapshotTimeline'
import { DescriptionBlock } from '@/components/ui/DescriptionBlock'
import { MapViewWrapper } from '@/components/map/MapViewWrapper'
import type { ListingPublic, Snapshot } from '@/types'
import { env } from '@/lib/env'

interface PageProps {
  params: Promise<{ id: string }>
}

// Raw shape from JSON.parse — dates are strings, not Date objects
type RawListingPublic = Omit<ListingPublic, 'scrapedAt' | 'updatedAt' | 'scoredAt'> & {
  scrapedAt: string
  updatedAt: string
  scoredAt:  string | null
}

type RawSnapshot = Omit<Snapshot, 'snappedAt'> & { snappedAt: string }

async function getListing(id: string): Promise<ListingPublic | null> {
  const res = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/listings/${id}`, {
    next: { revalidate: 60 },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch listing')
  // API returns { data: listing } envelope
  const { data: raw }: { data: RawListingPublic } = await res.json()
  return {
    ...raw,
    scrapedAt: new Date(raw.scrapedAt),
    updatedAt: new Date(raw.updatedAt),
    scoredAt:  raw.scoredAt ? new Date(raw.scoredAt) : null,
  }
}

async function getSnapshots(refId: string): Promise<Snapshot[]> {
  const res = await fetch(
    `${env.NEXT_PUBLIC_APP_URL}/api/snapshots?refId=${encodeURIComponent(refId)}&refType=listing`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return []
  // API returns { data: snapshots[] } envelope
  const { data: raws }: { data: RawSnapshot[] } = await res.json()
  return raws.map((r) => ({ ...r, snappedAt: new Date(r.snappedAt) }))
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params

  const [listing, snapshots] = await Promise.all([
    getListing(id),
    getSnapshots(id),
  ])

  if (!listing) notFound()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ImageGallery images={listing.images} title={listing.title} />

      <ListingDetailHeader listing={listing} />

      <ListingMetaGrid listing={listing} />

      {listing.description && (
        <DescriptionBlock text={listing.description} maxLines={6} />
      )}

      {listing.lat != null && listing.lng != null && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Location
          </h2>
          {/*
            MapView uses Leaflet which requires browser APIs.
            MapViewWrapper loads it via next/dynamic({ ssr: false }).
          */}
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
            <MapViewWrapper
              items={[{
                id:    listing.id,
                lat:   listing.lat,
                lng:   listing.lng,
                title: listing.title,
                price: listing.price,
              }]}
              center={[listing.lat, listing.lng]}
              zoom={15}
            />
          </Suspense>
        </section>
      )}

      {snapshots.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Price &amp; Change History
          </h2>
          <SnapshotTimeline snapshots={snapshots} />
        </section>
      )}
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const listing = await getListing(id)
  if (!listing) return {}
  return {
    title:       `${listing.title} — Offer Scrapper`,
    description: listing.description?.slice(0, 160),
  }
}
