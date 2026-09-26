'use client'
// Next.js 16 requires 'use client' when using dynamic({ ssr: false }).
// This remains a thin wrapper — it adds no state or hooks of its own.
// MapView (Leaflet) is deferred to the browser via dynamic import.

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import type { MapViewItem } from '@/types'

const MapViewClient = dynamic(
  () => import('./MapView').then((m) => m.MapView),
  {
    ssr:     false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  }
)

interface MapViewWrapperProps {
  items:     MapViewItem[]
  center?:   [number, number]
  zoom?:     number
}

export function MapViewWrapper(props: MapViewWrapperProps) {
  return <MapViewClient {...props} />
}
