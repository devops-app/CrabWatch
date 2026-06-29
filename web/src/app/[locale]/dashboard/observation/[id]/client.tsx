'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { useAuthStore } from '@/lib/authStore'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/useFormatters'
import { getCoinKey } from '@crabwatch/shared'
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
  const t = useTranslations('observation')
  const tCapture = useTranslations('capture')
  const fmt = useFormatters()
  const [observation, setObservation] = useState<ObservationResponse | null>(initialObservation ?? null)
  const [loading, setLoading] = useState(false)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ type: 'delete' | 'resubmit'; visible: boolean }>({ type: 'delete', visible: false })
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const user = useAuthStore(state => state.user)
  const isOwner = user?.id === observation?.userId
  const canEdit = observation?.status !== 'approved' && (observation?.status === 'rejected' ? isOwner : isOwner || user?.role === 'researcher' || user?.role === 'admin')
  const canDelete = observation?.status !== 'approved' && (observation?.status === 'rejected' ? isOwner : isOwner || user?.role === 'admin')
  const canResubmit = isOwner && observation?.status === 'rejected'

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

   const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const showFlash = (type: 'success' | 'error', message: string) => {
    setFlash({ type, message })
    setTimeout(() => setFlash(null), 3000)
  }

  const handleDelete = async () => {
    if (!observation) return
    try {
      await api.deleteObservation(observation.id)
      showFlash('success', t('deleteSuccess'))
      setTimeout(() => router.back(), 800)
    } catch (err) {
      logger.error('Failed to delete observation', err)
      showFlash('error', t('deleteFailed'))
    }
    setConfirmModal({ type: 'delete', visible: false })
  }

  const handleResubmit = async () => {
    if (!observation) return
    try {
      await api.updateObservation(observation.id, { status: 'PENDING' })
      showFlash('success', t('resubmitSuccess'))
      setObservation(prev => prev ? { ...prev, status: 'pending', rejectionReason: null, validatedBy: null, validatedAt: null } : null)
    } catch (err) {
      logger.error('Failed to resubmit observation', err)
      showFlash('error', t('resubmitFailed'))
    }
    setConfirmModal({ type: 'resubmit', visible: false })
  }

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
        <p className="text-gray-500">{t('notFound')}</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700">{t('goBack')}</button>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
          #print-area .card {
            break-inside: avoid !important;
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
          }
          #print-area img {
            max-width: 300px !important;
            height: auto !important;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
      <div id="print-area" className="space-y-6">
      {/* Header */}
      <div className="card">
<div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-ocean-900">
                {observation.species.commonName || observation.species.scientificName}
              </h1>
              <p className="text-sm text-gray-500 italic">{observation.species.scientificName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[observation.status] || 'bg-gray-100 text-gray-800'}`}>
                {observation.status}
              </span>
              <button
                onClick={handlePrint}
                className="p-2 text-gray-500 hover:text-ocean-600 hover:bg-ocean-50 rounded-lg transition-colors print:hidden"
                aria-label={t('print')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
              {canResubmit && (
                <button
                  onClick={() => setConfirmModal({ type: 'resubmit', visible: true })}
                  className="p-2 text-ocean-600 hover:text-ocean-800 hover:bg-ocean-50 rounded-lg transition-colors print:hidden"
                  aria-label={t('resubmit')}
                  title={t('resubmit')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => router.push(`/dashboard/capture?edit=${observation.id}`)}
                  className="p-2 text-gray-500 hover:text-ocean-600 hover:bg-ocean-50 rounded-lg transition-colors print:hidden"
                  aria-label={t('edit')}
                  title={t('edit')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => setConfirmModal({ type: 'delete', visible: true })}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors print:hidden"
                  aria-label={t('delete')}
                  title={t('delete')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>By {observation.user.name}</span>
          <span>&middot;</span>
          <span>{fmt.formatDate(new Date(observation.createdAt))}</span>
        </div>
      </div>

      {/* Photos */}
      {observation.photos.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-ocean-800 mb-4">{t('photos')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {observation.photos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setFullscreenPhoto(photo)}
                className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-ocean-400 transition-colors"
              >
                <img src={photo} alt={`${t('photo')} ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Measurements */}
      <div className="card">
        <h2 className="text-lg font-semibold text-ocean-800 mb-4">{t('measurements')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-ocean-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{t('carapaceWidth')}</p>
            <p className="text-2xl font-bold text-ocean-900">
              {fmt.formatNumber(observation.cw, 1)}<span className="text-sm font-normal text-gray-500 ml-1">cm</span>
            </p>
          </div>
          <div className="bg-ocean-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{t('bodyWeight')}</p>
            <p className="text-2xl font-bold text-ocean-900">
              {observation.bw != null ? (
                <>
                  {fmt.formatNumber(observation.bw, 1)}
                  <span className="text-sm font-normal text-gray-500 ml-1">g</span>
                </>
              ) : t('weightNa')}
            </p>
          </div>
          {observation.bw && observation.cw > 0 && (
            <div className="bg-ocean-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">{t('conditionIndex')}</p>
              <p className="text-2xl font-bold text-ocean-900">
                {fmt.formatNumber((observation.bw / (observation.cw ** 3)) * 100, 2)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Biological Data */}
      <div className="card">
      <h2 className="text-lg font-semibold text-ocean-800 mb-4">{t('biologicalData')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('gender')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('maturation')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('referenceCoin')}</p>
            <p className="font-medium">{observation.detectedCoin ? (tCapture(`coins.${getCoinKey(observation.detectedCoin)}`) || observation.detectedCoin) : t('weightNa')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('locationMethod')}</p>
            <p className="font-medium capitalize">{observation.locationMethod}</p>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="card">
        <h2 className="text-lg font-semibold text-ocean-800 mb-4">{t('location')}</h2>
        <div className="flex items-center gap-4">
          <div className="bg-gray-50 rounded-lg p-4 flex-1">
            <p className="text-xs text-gray-500 mb-1">{t('coordinates')}</p>
            <p className="font-mono text-sm">{fmt.formatNumber(observation.lat, 6)}, {fmt.formatNumber(observation.lng, 6)}</p>
          </div>
          <a
            href={`https://www.google.com/maps?q=${observation.lat},${observation.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm text-ocean-600 border border-ocean-200 rounded-lg hover:bg-ocean-50 transition-colors"
          >
            {t('openInMaps')}
          </a>
        </div>
      </div>

      {/* Notes */}
      {observation.notes && (
        <div className="card">
          <h2 className="text-lg font-semibold text-ocean-800 mb-3">{t('notes')}</h2>
          <p className="text-gray-700 text-sm bg-gray-50 rounded-lg p-4">{observation.notes}</p>
        </div>
      )}

      {/* Validation Info */}
      {(observation.validatedAt || observation.rejectionReason) && (
        <div className="card">
          <h2 className="text-lg font-semibold text-ocean-800 mb-3">{t('validation')}</h2>
          {observation.validatedAt && (
            <p className="text-sm text-gray-700">
              {t('validatedOn')} {fmt.formatDate(new Date(observation.validatedAt))}
              {observation.validatedBy && ` ${t('byUser')} ${observation.validatedBy.slice(0, 8)}`}
            </p>
          )}
          {observation.rejectionReason && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-500 font-medium mb-1">{t('rejectionReason')}</p>
              <p className="text-sm text-red-700">{observation.rejectionReason}</p>
            </div>
          )}
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="text-ocean-600 hover:underline text-sm print:hidden"
      >
        {t('back')}
      </button>
      </div>

      {/* Flash Message */}
      {flash && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-[70] print:hidden ${flash.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {flash.message}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.visible && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmModal.type === 'delete' ? t('confirmDeleteTitle') : t('confirmResubmitTitle')}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {confirmModal.type === 'delete' ? t('confirmDelete') : t('confirmResubmit')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ type: 'delete', visible: false })}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmModal.type === 'delete' ? handleDelete : handleResubmit}
                className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-ocean-600 hover:bg-ocean-700'}`}
              >
                {confirmModal.type === 'delete' ? t('delete') : t('resubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Modal */}
      {fullscreenPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 print:hidden"
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
            alt={t('fullView')}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
