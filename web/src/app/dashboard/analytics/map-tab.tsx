'use client'

import { memo, useState, useEffect, useMemo, useCallback } from 'react'
import Map, { Marker, NavigationControl, FullscreenControl } from 'react-map-gl'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { MALAYSIA_BOUNDS, ObservationResponse } from '@crabwatch/shared'
import { clusterObservations } from '@/lib/clustering'
import { useDebounce } from '@/hooks/useDebounce'

const STATUS_COLORS: Record<string, string> = {
  approved: '#22c55e',
  pending: '#f59e0b',
  rejected: '#ef4444',
  default: '#94a3b8',
}

const MAP_PAGE_LIMIT = 500
const MAP_MAX_OBS = 5000

interface MapTabProps {
  selectedSpecies: string
  effectiveDates: { from: string; to: string }
  genderFilter: string
  onGenderFilterChange: (v: string) => void
  getSpeciesName: (id: string) => string
  formatFilterDate: (d: string) => string
}

const MapTab = memo(function MapTab({
  selectedSpecies,
  effectiveDates,
  genderFilter,
  onGenderFilterChange,
  getSpeciesName,
  formatFilterDate,
}: MapTabProps): React.JSX.Element {
  const [mapObs, setMapObs] = useState<ObservationResponse[]>([])
  const [mapTotal, setMapTotal] = useState(0)
  const [mapLoading, setMapLoading] = useState(false)
  const [selectedObs, setSelectedObs] = useState<ObservationResponse | null>(null)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [viewport, setViewport] = useState({
    latitude: MALAYSIA_BOUNDS.center.lat,
    longitude: MALAYSIA_BOUNDS.center.lng,
    zoom: 5,
  })
  const debouncedViewport = useDebounce(viewport, 150)

  const loadMapObs = useCallback(async () => {
    setMapLoading(true)
    try {
      const sp = selectedSpecies || undefined
      const df = effectiveDates.from || undefined
      const dt = effectiveDates.to || undefined
      const gender = genderFilter || undefined

      let page = 1
      let totalPages = 1
      let total = 0
      const all: ObservationResponse[] = []

      while (page <= totalPages && all.length < MAP_MAX_OBS) {
        const data = await api.listObservations({
          speciesId: sp,
          dateFrom: df,
          dateTo: dt,
          gender,
          status: 'approved',
          page,
          limit: MAP_PAGE_LIMIT,
        })

        all.push(...data.observations)
        totalPages = data.totalPages
        total = data.total
        page += 1
      }

      setMapObs(all)
      setMapTotal(total)
    } catch (err) {
      logger.error('Failed to load map observations', err)
      setMapObs([])
      setMapTotal(0)
    } finally {
      setMapLoading(false)
    }
  }, [selectedSpecies, effectiveDates, genderFilter])

  useEffect(() => { loadMapObs() }, [loadMapObs])

  const validMapObs = useMemo(
    () => mapObs.filter(obs => obs.lat != null && obs.lng != null),
    [mapObs]
  )

  useEffect(() => {
    if (mapObs.length === 0) return
    const validObs = validMapObs
    if (validObs.length >= 2) {
      const lats = validObs.map(o => o.lat!)
      const lngs = validObs.map(o => o.lng!)
      setViewport(prev => ({
        ...prev,
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
        zoom: Math.min(12, prev.zoom),
      }))
    } else if (validObs.length === 1) {
      setViewport(prev => ({
        ...prev,
        latitude: validObs[0].lat!,
        longitude: validObs[0].lng!,
        zoom: 10,
      }))
    }
  }, [mapObs, validMapObs])

  const clusteredMarkers = useMemo(() => {
    if (mapObs.length === 0) return []
    const validObs = validMapObs
    if (validObs.length === 0) return []

    const lngs = validObs.map(o => o.lng!)
    const lats = validObs.map(o => o.lat!)

    if (validObs.length <= 30) {
      return validObs.map(obs => ({
        type: 'point' as const,
        data: obs,
        key: `point-${obs.id}`,
        lng: obs.lng!,
        lat: obs.lat!,
      }))
    }

    const clusters = clusterObservations(lngs, lats, debouncedViewport.zoom)
    return clusters.map((cluster, idx) => ({
      type: 'cluster' as const,
      cluster,
      key: `cluster-${idx}`,
      lng: 0,
      lat: 0,
    }))
  }, [mapObs, validMapObs, debouncedViewport.zoom])

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-xl font-semibold text-ocean-800 mb-1">Observation Map</h2>
          <p className="text-sm text-gray-500">Spatial distribution of observations</p>
        </div>
        <select
          value={genderFilter}
          onChange={(e) => onGenderFilterChange(e.target.value)}
          className="input-field text-sm py-1 w-auto"
        >
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>
      {mapLoading ? (
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 280px)' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-ocean-200 border-t-ocean-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading map...</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border" style={{ height: 'calc(100vh - 280px)' }}>
          <Map
            {...debouncedViewport}
            onMove={(e) => setViewport(e.viewState)}
            mapStyle="mapbox://styles/mapbox/light-v11"
            mapboxAccessToken={process.env.MAPBOX_TOKEN}
            attributionControl={false}
          >
            <NavigationControl />
            <FullscreenControl />
            {clusteredMarkers.map((marker) => {
              if (marker.type === 'cluster') {
                return (
                  <Marker
                    key={marker.key}
                    latitude={marker.cluster.points[0][1]}
                    longitude={marker.cluster.points[0][0]}
                  >
                    <div
                      className="flex items-center justify-center rounded-full border-2 border-white shadow cursor-pointer transition-transform hover:scale-110"
                      style={{
                        width: `${Math.min(48, 24 + marker.cluster.count * 2)}px`,
                        height: `${Math.min(48, 24 + marker.cluster.count * 2)}px`,
                        backgroundColor: '#3b82f6',
                        fontSize: `${Math.min(16, 12 + marker.cluster.count)}px`,
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      {marker.cluster.count}
                    </div>
                  </Marker>
                )
              }
              return (
                <Marker
                  key={marker.data.id}
                  latitude={marker.lat}
                  longitude={marker.lng}
                  onClick={(e) => {
                    e.originalEvent.stopPropagation()
                    setSelectedObs(marker.data)
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow cursor-pointer hover:scale-125 transition-transform"
                    style={{ backgroundColor: STATUS_COLORS[marker.data.status] || STATUS_COLORS.default }}
                  />
                </Marker>
              )
            })}
          </Map>
          {selectedObs && (
            <div className="absolute top-4 right-4 bg-white rounded-xl shadow-xl max-w-sm w-full">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-ocean-800">{selectedObs.species.commonName}</h3>
                  <button onClick={() => setSelectedObs(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <p className="text-xs text-gray-500 italic mb-3">{selectedObs.species.scientificName}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">CW</span>
                    <span className="font-medium">{selectedObs.cw} cm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">BW</span>
                    <span className="font-medium">{selectedObs.bw ?? 'N/A'} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gender</span>
                    <span className="font-medium capitalize">{selectedObs.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className="font-medium capitalize px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: STATUS_COLORS[selectedObs.status] + '20', color: STATUS_COLORS[selectedObs.status] }}>{selectedObs.status}</span>
                  </div>
                  {selectedObs.detectedCoin && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Coin</span>
                      <span className="font-medium">{selectedObs.detectedCoin}</span>
                    </div>
                  )}
                </div>
                {selectedObs.photos.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {selectedObs.photos.map((photo, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFullscreenPhoto(photo)}
                        className="block w-14 h-14 rounded-lg overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ocean-500"
                        aria-label={`View photo ${i + 1} full screen`}
                      >
                        <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-white/90 rounded-lg px-3 py-2 text-xs text-gray-600">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16">Species</span>
                <span className="font-medium">{getSpeciesName(selectedSpecies) || 'All Species'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16">Gender</span>
                <span className="font-medium capitalize">{genderFilter || 'All Genders'}</span>
              </div>
              {effectiveDates.from && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-16">Period</span>
                  <span className="font-medium">
                    {formatFilterDate(effectiveDates.from) || 'Start'} — {formatFilterDate(effectiveDates.to) || 'Now'}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16">Count</span>
                <span className="font-medium">{validMapObs.length} with coordinates</span>
              </div>
              {mapTotal > mapObs.length && (
                <div className="text-[11px] text-amber-700 mt-1">Showing first {mapObs.length} of {mapTotal} observations</div>
              )}
            </div>
          </div>
        </div>
      )}
      {fullscreenPhoto && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60]" onClick={() => setFullscreenPhoto(null)} role="presentation">
          <button className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black/50" onClick={() => setFullscreenPhoto(null)} aria-label="Close full screen photo">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={fullscreenPhoto} alt="Observation full screen" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
})

export default MapTab
