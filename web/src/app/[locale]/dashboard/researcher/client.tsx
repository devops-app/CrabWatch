'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/useFormatters'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import type { ObservationResponse } from '@crabwatch/shared'

type DateRange = '1week' | '1month' | '3months' | '6months' | '1year' | 'custom' | null

type ResearcherTab = 'pending' | 'approved'

interface ResearcherClientProps {
  initialObservations?: ObservationResponse[] | null
  initialTotal?: number | null
}

export function ResearcherClient({
  initialObservations,
  initialTotal,
}: ResearcherClientProps): React.JSX.Element {
  const t = useTranslations('researcher')
  const fmt = useFormatters()
  const [activeTab, setActiveTab] = useState<ResearcherTab>('pending')
  const [observations, setObservations] = useState<ObservationResponse[]>(initialObservations ?? [])
  const [total, setTotal] = useState(initialTotal ?? 0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedObs, setSelectedObs] = useState<ObservationResponse | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>(null)
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const dateDropdownRef = useRef<HTMLDivElement>(null)

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

  const effectiveDates = useMemo(() => {
    if (!dateRange || dateRange === 'custom') {
      return { from: customDateFrom || undefined, to: customDateTo || undefined }
    }
    const now = new Date()
    const to = now.toISOString().split('T')[0]
    const offsets: Record<string, number> = { '1week': 7, '1month': 30, '3months': 90, '6months': 180, '1year': 365 }
    const from = new Date(now.getTime() - offsets[dateRange] * 86400000).toISOString().split('T')[0]
    return { from, to }
  }, [dateRange, customDateFrom, customDateTo])

  const dateRangeLabel = useMemo(() => {
    if (!dateRange) return t('filters.allTime')
    const labels: Record<string, string> = {
      '1week': t('dateRanges.oneWeek'),
      '1month': t('dateRanges.oneMonth'),
      '3months': t('dateRanges.threeMonths'),
      '6months': t('dateRanges.sixMonths'),
      '1year': t('dateRanges.oneYear'),
      custom: t('dateRanges.custom'),
    }
    return labels[dateRange]
  }, [dateRange, t])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
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

  const loadObservations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listObservations({
        page,
        limit: 20,
        status: activeTab === 'pending' ? 'pending' : 'approved',
        dateFrom: effectiveDates.from,
        dateTo: effectiveDates.to,
      })
      setObservations(data.observations)
      setTotal(data.total)
    } catch (err) {
      logger.error('Failed to load observations', err)
    } finally {
      setLoading(false)
    }
  }, [page, activeTab, effectiveDates])

  useEffect(() => {
    if (initialObservations) return
    loadObservations()
  }, [initialObservations, loadObservations])

  const handleTabChange = (tab: ResearcherTab) => {
    setActiveTab(tab)
    setPage(1)
  }

  useEffect(() => {
    if (!initialObservations) {
      loadObservations()
    }
  }, [activeTab, loadObservations, initialObservations])

  useEffect(() => {
    if (!initialObservations) {
      setPage(1)
    }
  }, [dateRange, customDateFrom, customDateTo, initialObservations])

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
      loadObservations()
    } catch (err) {
      logger.error('Validation failed', err)
    } finally {
      setActionLoading(false)
    }
  }

  const subtitleKey =
    activeTab === 'pending'
      ? total === 1 ? 'pendingCount_one' : 'pendingCount_other'
      : total === 1 ? 'approvedCount_one' : 'approvedCount_other'
  const emptyKey = activeTab === 'pending' ? 'pendingEmpty' : 'approvedEmpty'

  return (
    <>
      <h1 className="text-3xl font-bold text-ocean-900 mb-2">
        {t('title')}
      </h1>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => handleTabChange('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-ocean-600 text-ocean-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('tabs.pending')}
          {activeTab !== 'pending' && total > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">
              {total}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('approved')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'approved'
              ? 'border-ocean-600 text-ocean-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('tabs.approved')}
        </button>
      </div>

      <p className="text-gray-600 mb-8">
        {t(subtitleKey, { count: total })}
      </p>

      {activeTab === 'approved' && (
        <div className="mb-6 flex items-end gap-3">
          <div ref={dateDropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('filters.date')}</label>
            <button
              type="button"
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className={`input-field text-sm py-1.5 text-left flex items-center justify-between gap-2 ${
                dateRange ? 'text-ocean-700 font-medium' : 'text-gray-500'
              }`}
            >
              <span>{dateRangeLabel}</span>
              <svg className={`w-4 h-4 transition-transform ${dateDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dateDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 min-w-[200px] overflow-hidden">
                <div className="py-1">
                  {(
                    [
                      { id: '1week', label: t('dateRanges.oneWeek') },
                      { id: '1month', label: t('dateRanges.oneMonth') },
                      { id: '3months', label: t('dateRanges.threeMonths') },
                      { id: '6months', label: t('dateRanges.sixMonths') },
                      { id: '1year', label: t('dateRanges.oneYear') },
                    ] as const
                  ).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        dateRange === r.id
                          ? 'bg-ocean-50 text-ocean-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => { setDateRange(r.id as DateRange); setDateDropdownOpen(false) }}
                    >
                      {r.label}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        dateRange === 'custom'
                          ? 'bg-ocean-50 text-ocean-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => { setDateRange('custom'); setDateDropdownOpen(false) }}
                    >
                      {t('dateRanges.custom')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {dateRange === 'custom' && (
            <div className="flex gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('dateRanges.from')}</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="input-field text-sm py-1.5 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('dateRanges.to')}</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="input-field text-sm py-1.5 w-full"
                />
              </div>
            </div>
          )}
          {dateRange && (
            <div>
              <button
                type="button"
                className="btn-secondary text-sm py-1.5"
                onClick={() => { setDateRange(null); setCustomDateFrom(''); setCustomDateTo('') }}
              >
                {t('filters.clear')}
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg">{t('loading')}</p>
        </div>
      ) : observations.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg">
            {t(emptyKey)}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {observations.map((obs) => (
              <div
                key={obs.id}
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
                aria-label={t('reviewObservation', { species: obs.species.commonName })}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-ocean-800">
                      {obs.species.commonName} ({obs.species.scientificName})
                    </h3>
                    <p className="text-sm text-gray-500">
                      by {obs.user.name} &middot;{' '}
                      {fmt.formatDate(new Date(obs.createdAt))}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      activeTab === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      CW: {obs.cw}cm | BW: {obs.bw ?? t('na')}g
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
                {t('previous')}
              </button>
              <span className="px-4 py-2 text-gray-600">
                {t('pageOf', { page, total: Math.ceil(total / 20) })}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="btn-secondary"
              >
                {t('next')}
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
                {t('reviewTitle')}
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-500">{t('species')}</span>
                  <p className="font-medium">{selectedObs.species.commonName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">{t('scientificName')}</span>
                  <p className="font-medium italic">{selectedObs.species.scientificName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">{t('carapaceWidth')}</span>
                  <p className="font-medium">{selectedObs.cw} cm</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">{t('bodyWeight')}</span>
                  <p className="font-medium">{selectedObs.bw ?? t('na')} g</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">{t('gender')}</span>
                  <p className="font-medium capitalize">{selectedObs.gender}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">{t('maturation')}</span>
                  <p className="font-medium capitalize">{selectedObs.maturationStatus}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">{t('location')}</span>
                  <p className="font-medium">
                    {fmt.formatNumber(selectedObs.lat, 4)}, {fmt.formatNumber(selectedObs.lng, 4)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">{t('submitted')}</span>
                  <p className="font-medium">
                    {fmt.formatDate(new Date(selectedObs.createdAt))}
                  </p>
                </div>
                {selectedObs.detectedCoin && (
                  <div>
                    <span className="text-sm text-gray-500">{t('referenceCoin')}</span>
                    <p className="font-medium">{selectedObs.detectedCoin}</p>
                  </div>
                )}
              </div>

              {selectedObs.notes && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500">{t('notes')}</span>
                  <p className="font-medium">{selectedObs.notes}</p>
                </div>
              )}

              {selectedObs.photos.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500">{t('photos')}</span>
                  <div className="flex gap-2 mt-2">
                    {selectedObs.photos.map((photo, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFullscreenPhoto(photo)}
                        className="block w-24 h-24 rounded-lg overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ocean-500"
                        aria-label={t('viewPhoto', { index: i + 1 })}
                      >
                        <img
                          src={photo}
                          alt={t('photoAlt', { index: i + 1 })}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'pending' && (
                <>
                  <div className="mb-4">
                    <label htmlFor="rejection-reason" className="block text-sm text-gray-500 mb-1">
                      {t('rejectionReason')}
                    </label>
                    <textarea
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="input-field"
                      rows={3}
                      placeholder={t('rejectionPlaceholder')}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleValidate('approved')}
                      disabled={actionLoading}
                      className="btn-primary flex-1 bg-mangrove-600 hover:bg-mangrove-700"
                    >
                      {actionLoading ? t('processing') : t('approve')}
                    </button>
                    <button
                      onClick={() => handleValidate('rejected')}
                      disabled={actionLoading}
                      className="btn-danger flex-1"
                    >
                      {t('reject')}
                    </button>
                    <button
                      onClick={closeModal}
                      className="btn-secondary"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </>
              )}
              {activeTab === 'approved' && (
                <div className="flex justify-end">
                  <button
                    onClick={closeModal}
                    className="btn-secondary"
                  >
                    {t('close')}
                  </button>
                </div>
              )}
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
              alt={t('fullScreen')}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
        </div>
      )}
    </>
  )
}
