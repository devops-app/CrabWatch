'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import type { ObservationResponse } from '@crabwatch/shared'

interface ObservationClientProps {
  initialObservation?: ObservationResponse | null
  idPromise?: Promise<{ id: string }>
}

export function ObservationClient({
  initialObservation,
  idPromise,
}: ObservationClientProps): React.JSX.Element {
  const router = useRouter()
  const [observation, setObservation] = useState<ObservationResponse | null>(initialObservation ?? null)
  const [loading, setLoading] = useState(false)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (initialObservation) return
    if (!idPromise) return
    let cancelled = false
    idPromise.then(async (params) => {
      setLoading(true)
      try {
        const data = await api.getObservation(params.id)
        if (!cancelled) {
          setObservation(data)
        }
      } catch (err) {
        if (!cancelled) {
          logger.error('Failed to load observation', err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })
    return () => { cancelled = true }
  }, [initialObservation, idPromise])

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-ocean-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!observation) {
    return (
      <div className="card text-center py-10">
        <p className="text-gray-500">Observation not found</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700">Go Back</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-ocean-900">
              {observation.species.commonName || observation.species.scientificName}
            </h1>
            <p className="text-sm text-gray-500 italic">{observation.species.scientificName}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[observation.status] || 'bg-gray-100 text-gray-800'}`}>
            {observation.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>By {observation.user.name}</span>
          <span>&middot;</span>
          <span>{new Date(observation.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Photos */}
      {observation.photos.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-ocean-800 mb-4">Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {observation.photos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setFullscreenPhoto(photo)}
                className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-ocean-400 transition-colors"
              >
                <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Measurements */}
      <div className="card">
        <h2 className="text-lg font-semibold text-ocean-800 mb-4">Measurements</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-ocean-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Carapace Width</p>
            <p className="text-2xl font-bold text-ocean-900">
              {observation.cw.toFixed(1)}<span className="text-sm font-normal text-gray-500 ml-1">cm</span>
            </p>
          </div>
          <div className="bg-ocean-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Body Weight</p>
            <p className="text-2xl font-bold text-ocean-900">
              {observation.bw != null ? (
                <>
                  {observation.bw.toFixed(1)}
                  <span className="text-sm font-normal text-gray-500 ml-1">g</span>
                </>
              ) : 'N/A'}
            </p>
          </div>
          {observation.bw && observation.cw > 0 && (
            <div className="bg-ocean-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Condition Index</p>
              <p className="text-2xl font-bold text-ocean-900">
                {((observation.bw / (observation.cw ** 3)) * 100).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Biological Data */}
      <div className="card">
        <h2 className="text-lg font-semibold text-ocean-800 mb-4">Biological Data</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Gender</p>
            <p className="font-medium capitalize">{observation.gender}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Maturation</p>
            <p className="font-medium capitalize">{observation.maturationStatus}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Reference Coin</p>
            <p className="font-medium">{observation.detectedCoin || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Location Method</p>
            <p className="font-medium capitalize">{observation.locationMethod}</p>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="card">
        <h2 className="text-lg font-semibold text-ocean-800 mb-4">Location</h2>
        <div className="flex items-center gap-4">
          <div className="bg-gray-50 rounded-lg p-4 flex-1">
            <p className="text-xs text-gray-500 mb-1">Coordinates</p>
            <p className="font-mono text-sm">{observation.lat.toFixed(6)}, {observation.lng.toFixed(6)}</p>
          </div>
          <a
            href={`https://www.google.com/maps?q=${observation.lat},${observation.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm text-ocean-600 border border-ocean-200 rounded-lg hover:bg-ocean-50 transition-colors"
          >
            Open in Maps
          </a>
        </div>
      </div>

      {/* Notes */}
      {observation.notes && (
        <div className="card">
          <h2 className="text-lg font-semibold text-ocean-800 mb-3">Notes</h2>
          <p className="text-gray-700 text-sm bg-gray-50 rounded-lg p-4">{observation.notes}</p>
        </div>
      )}

      {/* Validation Info */}
      {(observation.validatedAt || observation.rejectionReason) && (
        <div className="card">
          <h2 className="text-lg font-semibold text-ocean-800 mb-3">Validation</h2>
          {observation.validatedAt && (
            <p className="text-sm text-gray-700">
              Validated on {new Date(observation.validatedAt).toLocaleDateString()}
              {observation.validatedBy && ` by user ${observation.validatedBy.slice(0, 8)}`}
            </p>
          )}
          {observation.rejectionReason && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-500 font-medium mb-1">Rejection Reason</p>
              <p className="text-sm text-red-700">{observation.rejectionReason}</p>
            </div>
          )}
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="text-ocean-600 hover:underline text-sm"
      >
        &larr; Back
      </button>

      {/* Fullscreen Photo Modal */}
      {fullscreenPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setFullscreenPhoto(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={fullscreenPhoto}
            alt="Full view"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
