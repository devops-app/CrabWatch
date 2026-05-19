'use client'

import { useEffect } from 'react'
import Map, { Layer, Source } from 'react-map-gl'
import mapboxgl from 'mapbox-gl'

const mapboxApi = mapboxgl as unknown as { setTelemetryEnabled?: (enabled: boolean) => void }
mapboxApi.setTelemetryEnabled?.(false)

interface MapPickerProps {
  viewport: { latitude: number; longitude: number; zoom: number }
  onViewportChange: (viewport: { latitude: number; longitude: number; zoom: number }) => void
  onMapClick: (lat: number, lng: number) => void
  markerLat?: number
  markerLng?: number
}

export function MapPicker({ viewport, onViewportChange, onMapClick, markerLat, markerLng }: MapPickerProps) {
  useEffect(() => {
    mapboxApi.setTelemetryEnabled?.(false)
  }, [])

  const selectedPointGeoJson = markerLat != null && markerLng != null ? {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [markerLng, markerLat],
      },
      properties: {},
    }],
  } as const : null

  return (
    <div className="relative w-full h-[300px] rounded-lg overflow-hidden border">
      <Map
        mapLib={mapboxgl as unknown as Parameters<typeof Map>[0]['mapLib']}
        {...viewport}
        onMove={(e) => onViewportChange(e.viewState)}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.MAPBOX_TOKEN}
        interactive={true}
        onClick={(e) => {
          const { lat, lng } = e.lngLat
          onMapClick(lat, lng)
        }}
        attributionControl={false}
      >
        {selectedPointGeoJson && (
          <Source id="capture-selected-point" type="geojson" data={selectedPointGeoJson}>
            <Layer
              id="capture-selected-point-core"
              type="circle"
              paint={{
                'circle-radius': 7,
                'circle-color': '#ef4444',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
              }}
            />
            <Layer
              id="capture-selected-point-ring"
              type="circle"
              paint={{
                'circle-radius': 14,
                'circle-color': '#ef4444',
                'circle-opacity': 0.25,
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  )
}
