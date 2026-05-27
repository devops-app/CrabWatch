'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import type {
  SizeFrequencyData,
  GenderRatioData,
  CW50Data,
  ConditionIndexAggregatedData,
  SpeciesDistributionData,
  TemporalTrendData,
  SpeciesResponse,
} from '@crabwatch/shared'
import { useClickOutside } from '@/hooks/useClickOutside'

type TabId = 'size' | 'gender' | 'cw50' | 'condition' | 'species' | 'trends' | 'map'

const MapTab = dynamic(() => import('./map-tab'), {
  ssr: false,
  loading: () => (
    <div className="card flex items-center justify-center" style={{ height: 'calc(100vh - 280px)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-ocean-200 border-t-ocean-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    </div>
  ),
})

const ChartTabs = dynamic(() => import('./chart-tabs'), {
  ssr: false,
  loading: () => (
    <div className="card animate-pulse">
      <div className="h-64 bg-gray-200 rounded" />
    </div>
  ),
})

interface AnalyticsData {
  sizeFreq: SizeFrequencyData[]
  genderRatio: GenderRatioData[]
  cw50: CW50Data[]
  conditionIndices: ConditionIndexAggregatedData[]
  speciesDist: SpeciesDistributionData[]
  trends: TemporalTrendData[]
}

interface AnalyticsClientProps {
  initialSpecies: SpeciesResponse[] | null
  initialData: AnalyticsData | null
}

export function AnalyticsClient({ initialSpecies, initialData }: AnalyticsClientProps): React.JSX.Element {
  const t = useTranslations('analytics')
  const [sizeFreq, setSizeFreq] = useState<SizeFrequencyData[]>(initialData?.sizeFreq ?? [])
  const [genderRatio, setGenderRatio] = useState<GenderRatioData[]>(initialData?.genderRatio ?? [])
  const [cw50, setCw50] = useState<CW50Data[]>(initialData?.cw50 ?? [])
  const [conditionIndices, setConditionIndices] = useState<ConditionIndexAggregatedData[]>(initialData?.conditionIndices ?? [])
  const [speciesDist, setSpeciesDist] = useState<SpeciesDistributionData[]>(initialData?.speciesDist ?? [])
  const [trends, setTrends] = useState<TemporalTrendData[]>(initialData?.trends ?? [])
  const [species, setSpecies] = useState<SpeciesResponse[]>(initialSpecies ?? [])
  const [speciesLoading, setSpeciesLoading] = useState(!initialSpecies)

  useEffect(() => {
    if (initialSpecies) return
    let cancelled = false
    api.listSpecies().then(sp => {
      if (!cancelled) {
        setSpecies(sp)
        setSpeciesLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setSpeciesLoading(false)
    })
    return () => { cancelled = true }
  }, [])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('size')

  const [selectedSpecies, setSelectedSpecies] = useState<string>('')
  const [dateRange, setDateRange] = useState<string>('')
  const [customDateFrom, setCustomDateFrom] = useState<string>('')
  const [customDateTo, setCustomDateTo] = useState<string>('')
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false)
  const [genderFilter, setGenderFilter] = useState('')
  const [isPending, startTransition] = useTransition()
  const dateDropdownRef = useRef<HTMLDivElement>(null)

  useClickOutside(dateDropdownRef, () => setDateDropdownOpen(false))

  const dateRangeLabels: Record<string, string> = {
    '1week': t.raw('dateRanges.oneWeek'),
    '1month': t.raw('dateRanges.oneMonth'),
    '3months': t.raw('dateRanges.threeMonths'),
    '6months': t.raw('dateRanges.sixMonths'),
    '1year': t.raw('dateRanges.oneYear'),
    custom: t.raw('dateRanges.custom'),
  }

  const dateRangeLabel = dateRange ? (dateRangeLabels[dateRange] || dateRange) : t('filters.allTime')

  const effectiveDates = useMemo(() => {
    if (!dateRange) return { from: '', to: '' }
    if (dateRange === 'custom') return { from: customDateFrom, to: customDateTo }

    const now = new Date()
    const to = now.toISOString().split('T')[0]
    let from = ''

    switch (dateRange) {
      case '1week': { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString().split('T')[0]; break }
      case '1month': { const d = new Date(now); d.setMonth(d.getMonth() - 1); from = d.toISOString().split('T')[0]; break }
      case '3months': { const d = new Date(now); d.setMonth(d.getMonth() - 3); from = d.toISOString().split('T')[0]; break }
      case '6months': { const d = new Date(now); d.setMonth(d.getMonth() - 6); from = d.toISOString().split('T')[0]; break }
      case '1year': { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); from = d.toISOString().split('T')[0]; break }
    }
    return { from, to }
  }, [dateRange, customDateFrom, customDateTo])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const sp = selectedSpecies || undefined
      const df = effectiveDates.from || undefined
      const dt = effectiveDates.to || undefined

      const [sf, sr, c, ci, sd, tt] = await Promise.all([
        api.getSizeFrequency({ speciesId: sp, gender: genderFilter || undefined }),
        api.getGenderRatio({ speciesId: sp, dateFrom: df, dateTo: dt }),
        api.getCW50({ speciesId: sp }),
        api.getConditionIndices({ speciesId: sp }),
        api.getSpeciesDistribution({ dateFrom: df, dateTo: dt }),
        api.getTemporalTrends({ speciesId: sp }),
      ])
      setSizeFreq(sf)
      setGenderRatio(sr)
      setCw50(c)
      setConditionIndices(ci)
      setSpeciesDist(sd)
      setTrends(tt)
    } catch (err) {
      logger.error('Failed to load analytics', err)
    } finally {
      setLoading(false)
    }
  }, [selectedSpecies, effectiveDates, genderFilter])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'size', label: t('tabs.size'), icon: '📏' },
    { id: 'gender', label: t('tabs.gender'), icon: '⚤' },
    { id: 'cw50', label: t('tabs.cw50'), icon: '📐' },
    { id: 'condition', label: t('tabs.condition'), icon: '💪' },
    { id: 'species', label: t('tabs.species'), icon: '🦀' },
    { id: 'trends', label: t('tabs.trends'), icon: '📅' },
    { id: 'map', label: t('tabs.map'), icon: '🗺️' },
  ]

  const getSpeciesName = useCallback((id: string): string => {
    const s = species.find(sp => sp.id === id)
    return s ? s.commonName : ''
  }, [species])

  const formatFilterDate = useCallback((d: string): string => {
    if (!d) return ''
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }, [])

  const isChartTab = activeTab !== 'map'
  const showLoading = loading && isChartTab

  return (
    <>
      <h1 className="text-3xl font-bold text-ocean-900 mb-6">{t('title')}</h1>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('filters.species')}</label>
            <select
              value={selectedSpecies}
              onChange={(e) => startTransition(() => setSelectedSpecies(e.target.value))}
              className="input-field text-sm py-1.5 min-w-[200px]"
            >
              <option value="">{t('filters.allSpecies')}</option>
              {species.map((s) => (
                <option key={s.id} value={s.id}>{s.commonName} ({s.scientificName})</option>
              ))}
            </select>
          </div>
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
                  {[
                    { id: '1week', label: t('dateRanges.oneWeek') },
                    { id: '1month', label: t('dateRanges.oneMonth') },
                    { id: '3months', label: t('dateRanges.threeMonths') },
                    { id: '6months', label: t('dateRanges.sixMonths') },
                    { id: '1year', label: t('dateRanges.oneYear') },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        dateRange === r.id
                          ? 'bg-ocean-50 text-ocean-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => { startTransition(() => setDateRange(r.id)); setDateDropdownOpen(false) }}
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
                       onClick={() => startTransition(() => setDateRange('custom'))}
                     >
                       {t('dateRanges.custom')}
                     </button>
                  </div>
                </div>
                {dateRange === 'custom' && (
                  <div className="border-t border-gray-100 p-3 flex gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t('dateRanges.from')}</label>
                      <input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => startTransition(() => setCustomDateFrom(e.target.value))}
                        className="input-field text-sm py-1.5 w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t('dateRanges.to')}</label>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => startTransition(() => setCustomDateTo(e.target.value))}
                        className="input-field text-sm py-1.5 w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              className="btn-secondary text-sm py-1.5"
              onClick={() => startTransition(() => { setSelectedSpecies(''); setDateRange(''); setCustomDateFrom(''); setCustomDateTo('') })}
            >
              {t('filters.clear')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => startTransition(() => setActiveTab(tab.id))}
            className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-ocean-700 border-b-2 border-ocean-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Lazy-loaded tab content */}
      {showLoading ? (
        <div className="card animate-pulse">
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      ) : isChartTab ? (
        <ChartTabs
          sizeFreq={sizeFreq}
          genderRatio={genderRatio}
          cw50={cw50}
          conditionIndices={conditionIndices}
          speciesDist={speciesDist}
          trends={trends}
          activeTab={activeTab}
        />
      ) : (
        <MapTab
          selectedSpecies={selectedSpecies}
          effectiveDates={effectiveDates}
          genderFilter={genderFilter}
          onGenderFilterChange={setGenderFilter}
          getSpeciesName={getSpeciesName}
          formatFilterDate={formatFilterDate}
        />
      )}
    </>
  )
}
