'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import {
  SizeFrequencyData,
  GenderRatioData,
  CW50Data,
  TemporalTrendData,
  ConditionIndexAggregatedData,
  SpeciesDistributionData,
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

export default function AnalyticsPage(): React.JSX.Element {
  const [sizeFreq, setSizeFreq] = useState<SizeFrequencyData[]>([])
  const [genderRatio, setGenderRatio] = useState<GenderRatioData[]>([])
  const [cw50, setCw50] = useState<CW50Data[]>([])
  const [conditionIndices, setConditionIndices] = useState<ConditionIndexAggregatedData[]>([])
  const [speciesDist, setSpeciesDist] = useState<SpeciesDistributionData[]>([])
  const [trends, setTrends] = useState<TemporalTrendData[]>([])
  const [species, setSpecies] = useState<SpeciesResponse[]>([])
  const [loading, setLoading] = useState(true)
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
    '1week': '1 Week',
    '1month': '1 Month',
    '3months': '3 Months',
    '6months': '6 Months',
    '1year': '1 Year',
    custom: 'Custom',
  }

  const dateRangeLabel = dateRange ? (dateRangeLabels[dateRange] || dateRange) : 'All Time'

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

  useEffect(() => {
    loadSpecies()
  }, [])

  const loadSpecies = async () => {
    try {
      const data = await api.listSpecies()
      setSpecies(data)
    } catch {
      logger.error('Failed to load species')
    }
  }

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
    { id: 'size', label: 'Size Frequency', icon: '📏' },
    { id: 'gender', label: 'Gender Ratio', icon: '⚤' },
    { id: 'cw50', label: 'CW50', icon: '📐' },
    { id: 'condition', label: 'Condition Index', icon: '💪' },
    { id: 'species', label: 'Species', icon: '🦀' },
    { id: 'trends', label: 'Trends', icon: '📅' },
    { id: 'map', label: 'Map', icon: '🗺️' },
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

  return (
    <>
      <h1 className="text-3xl font-bold text-ocean-900 mb-6">Analytics</h1>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
            <select
              value={selectedSpecies}
              onChange={(e) => startTransition(() => setSelectedSpecies(e.target.value))}
              className="input-field text-sm py-1.5 min-w-[200px]"
            >
              <option value="">All Species</option>
              {species.map((s) => (
                <option key={s.id} value={s.id}>{s.commonName} ({s.scientificName})</option>
              ))}
            </select>
          </div>
          <div ref={dateDropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
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
                    { id: '1week', label: '1 Week' },
                    { id: '1month', label: '1 Month' },
                    { id: '3months', label: '3 Months' },
                    { id: '6months', label: '6 Months' },
                    { id: '1year', label: '1 Year' },
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
                      Custom
                    </button>
                  </div>
                </div>
                {dateRange === 'custom' && (
                  <div className="border-t border-gray-100 p-3 flex gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                      <input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => startTransition(() => setCustomDateFrom(e.target.value))}
                        className="input-field text-sm py-1.5 w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
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
              Clear Filters
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
      {loading && isChartTab ? (
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
