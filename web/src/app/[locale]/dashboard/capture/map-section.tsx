'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'

function MapLoading() {
  const t = useTranslations('capture')
  return (
    <div className="relative w-full h-[300px] rounded-lg overflow-hidden border flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-400">{t('map.loadingMap')}</p>
    </div>
  )
}

const MapComponent = dynamic(() => import('./map-picker').then(m => ({ default: m.MapPicker })), {
  ssr: false,
  loading: MapLoading,
})

interface MapSectionProps {
  lat: string
  lng: string
  mapViewport: { latitude: number; longitude: number; zoom: number }
  onMapClick: (lat: number, lng: number) => void
  onViewportChange: (viewport: { latitude: number; longitude: number; zoom: number }) => void
}

export function MapSection({ lat, lng, mapViewport, onMapClick, onViewportChange }: MapSectionProps) {
  const t = useTranslations('capture')
  const markerLat = Number.parseFloat(lat)
  const markerLng = Number.parseFloat(lng)
  const hasMapMarker = Number.isFinite(markerLat) && Number.isFinite(markerLng) && markerLat >= -90 && markerLat <= 90 && markerLng >= -180 && markerLng <= 180

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{t('map.pickLocationOnMap')}</label>
      <MapComponent
        viewport={mapViewport}
        onViewportChange={onViewportChange}
        onMapClick={onMapClick}
        markerLat={hasMapMarker ? markerLat : undefined}
        markerLng={hasMapMarker ? markerLng : undefined}
      />
      {hasMapMarker && (
        <p className="mt-2 text-xs text-gray-500">{t('map.selected')}: {markerLat.toFixed(6)}, {markerLng.toFixed(6)}</p>
      )}
    </div>
  )
}
