'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapViewItem } from '@/types'

// Fix Leaflet default icon paths broken by webpack asset hashing
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       (markerIcon as { src: string }).src,
  iconRetinaUrl: (markerIcon2x as { src: string }).src,
  shadowUrl:     (markerShadow as { src: string }).src,
})

interface MapViewProps {
  items:          MapViewItem[]
  onMarkerClick?: (id: string) => void
  center?:        [number, number]
  zoom?:          number
}

export function MapView({
  items,
  onMarkerClick,
  center = [52.23, 21.01],
  zoom   = 6,
}: MapViewProps) {
  return (
    <MapContainer
      center={center as LatLngExpression}
      zoom={zoom}
      // z-0 prevents the Leaflet tile layer from rendering above shadcn modal overlays
      className="h-64 w-full rounded-lg z-0"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {items.map((item) => (
        <Marker
          key={item.id}
          position={[item.lat, item.lng] as LatLngExpression}
          eventHandlers={{ click: () => onMarkerClick?.(item.id) }}
        >
          <Popup>
            <p className="text-sm font-medium">{item.title}</p>
            {item.price != null && (
              <p className="text-xs text-muted-foreground">
                {item.price.toLocaleString('pl-PL')} PLN
              </p>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
