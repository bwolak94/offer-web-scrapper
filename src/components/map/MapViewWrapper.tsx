// This file is a Server Component (no 'use client' directive).
// The dynamic() call with ssr:false ensures MapView (which uses Leaflet browser APIs)
// is never executed on the server — SSR would throw `window is not defined`.

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
