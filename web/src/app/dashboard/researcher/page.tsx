'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { ObservationResponse } from '@crabwatch/shared'

export default function ResearcherPage(): React.JSX.Element {
  const [observations, setObservations] = useState<ObservationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [selectedObs, setSelectedObs] = useState<ObservationResponse | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const openModal = useCallback((obs: ObservationResponse) => {
    previousFocusRef.current = document.activeElement as HTMLElement
    setSelectedObs(obs)
    setRejectionReason('')
  }, [])

  const closeModal = useCallback(() => {
    setSelectedObs(null)
    setRejectionReason('')
    if (previousFocusRef.current) {
      previousFocusRef.current.focus()
    }
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedObs || !modalRef.current) return

    if (e.key === 'Escape') {
      closeModal()
      return
    }

    if (e.key === 'Tab') {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }
  }, [selectedObs, closeModal])

  useEffect(() => {
    if (selectedObs) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedObs, handleKeyDown])

  const loadPending = useCallback(async () => {
    try {
      const data = await api.getPendingObservations({ page, limit: 20 })
      setObservations(data.observations)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load pending observations:', err)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadPending()
  }, [page, loadPending])

  const handleValidate = async (status: 'approved' | 'rejected') => {
    if (!selectedObs) return
    setActionLoading(true)
    try {
      await api.validateObservation(selectedObs.id, {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      })
      setSelectedObs(null)
      setRejectionReason('')
      loadPending()
    } catch (err) {
      console.error('Validation failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-ocean-900 mb-2">
        Validation Queue
      </h1>
      <p className="text-gray-600 mb-8">
        {total} observation{total !== 1 ? 's' : ''} pending review
      </p>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-60 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : observations.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg">
            No pending observations. All caught up!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {observations.map((obs) => (
              <div
                key={obs.id}
                ref={selectedObs?.id === obs.id ? triggerRef : undefined}
                className="card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openModal(obs)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openModal(obs)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Review observation for ${obs.species.commonName}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-ocean-800">
                      {obs.species.commonName} ({obs.species.scientificName})
                    </h3>
                    <p className="text-sm text-gray-500">
                      by {obs.user.name} &middot;{' '}
                      {new Date(obs.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                      CW: {obs.cw}cm | BW: {obs.bw ?? 'N/A'}g
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {total > 20 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-600">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedObs && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
          role="presentation"
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto outline-none"
            tabIndex={-1}
          >
            <div className="p-6">
              <h2 id="modal-title" className="text-xl font-bold text-ocean-900 mb-4">
                Review Observation
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-500">Species</span>
                  <p className="font-medium">
                    {selectedObs.species.commonName}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Scientific Name</span>
                  <p className="font-medium italic">
                    {selectedObs.species.scientificName}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Carapace Width</span>
                  <p className="font-medium">{selectedObs.cw} cm</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Body Weight</span>
                  <p className="font-medium">{selectedObs.bw ?? 'N/A'} g</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Gender</span>
                  <p className="font-medium capitalize">{selectedObs.gender}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Maturation</span>
                  <p className="font-medium capitalize">
                    {selectedObs.maturationStatus}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Location</span>
                  <p className="font-medium">
                    {selectedObs.lat.toFixed(4)}, {selectedObs.lng.toFixed(4)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Submitted</span>
                  <p className="font-medium">
                    {new Date(selectedObs.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedObs.detectedCoin && (
                  <div>
                    <span className="text-sm text-gray-500">Reference Coin</span>
                    <p className="font-medium">{selectedObs.detectedCoin}</p>
                  </div>
                )}
              </div>

              {selectedObs.notes && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500">Notes</span>
                  <p className="font-medium">{selectedObs.notes}</p>
                </div>
              )}

              {selectedObs.photos.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500">Photos</span>
                 <div className="flex gap-2 mt-2">
                      {selectedObs.photos.map((photo, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFullscreenPhoto(photo)}
                          className="block w-24 h-24 rounded-lg overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ocean-500"
                          aria-label={`View photo ${i + 1} full screen`}
                        >
                          <img
                            src={photo}
                            alt={`Observation photo ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="rejection-reason" className="block text-sm text-gray-500 mb-1">
                  Rejection Reason (optional)
                </label>
                <textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Provide reason for rejection..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleValidate('approved')}
                  disabled={actionLoading}
                  className="btn-primary flex-1 bg-mangrove-600 hover:bg-mangrove-700"
                >
                  {actionLoading ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleValidate('rejected')}
                  disabled={actionLoading}
                  className="btn-danger flex-1"
                >
                  Reject
                </button>
                <button
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {fullscreenPhoto && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60]"
          onClick={() => setFullscreenPhoto(null)}
          role="presentation"
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black/50"
            onClick={() => setFullscreenPhoto(null)}
            aria-label="Close full screen photo"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={fullscreenPhoto}
            alt="Observation full screen"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
