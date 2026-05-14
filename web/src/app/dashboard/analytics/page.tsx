'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import Map, { Marker, NavigationControl, FullscreenControl } from 'react-map-gl'
import { api } from '@/lib/api'
import {
  SizeFrequencyData,
  GenderRatioData,
  CW50Data,
  TemporalTrendData,
  ConditionIndexAggregatedData,
  SpeciesDistributionData,
  SpeciesResponse,
  ObservationResponse,
  MALAYSIA_BOUNDS,
} from '@crabwatch/shared'
import { clusterObservations } from '@/lib/clustering'
import { useDebounce } from '@/hooks/useDebounce'

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const STATUS_COLORS: Record<string, string> = {
  approved: '#22c55e',
  pending: '#f59e0b',
  rejected: '#ef4444',
  default: '#94a3b8',
}

type TabId = 'size' | 'gender' | 'cw50' | 'condition' | 'species' | 'trends' | 'map'

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
  const dateDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // Map state
  const [mapObs, setMapObs] = useState<ObservationResponse[]>([])
  const [mapLoading, setMapLoading] = useState(false)
  const [selectedObs, setSelectedObs] = useState<ObservationResponse | null>(null)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [genderFilter, setGenderFilter] = useState('')
  const [viewport, setViewport] = useState({
    latitude: MALAYSIA_BOUNDS.center.lat,
    longitude: MALAYSIA_BOUNDS.center.lng,
    zoom: 5,
  })
  const debouncedViewport = useDebounce(viewport, 150)

  useEffect(() => {
    loadSpecies()
  }, [])

  const loadSpecies = async () => {
    try {
      const data = await api.listSpecies()
      setSpecies(data)
    } catch {
      console.error('Failed to load species')
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
      console.error('Failed to load analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedSpecies, effectiveDates, genderFilter])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Load map observations when tab switches to map or filters change
  const loadMapObs = useCallback(async () => {
    setMapLoading(true)
    try {
      const sp = selectedSpecies || undefined
      const df = effectiveDates.from || undefined
      const dt = effectiveDates.to || undefined
      const gender = genderFilter || undefined
      const data = await api.listObservations({
        speciesId: sp,
        dateFrom: df,
        dateTo: dt,
        gender,
        status: 'approved',
        limit: 500,
      })
      setMapObs(data.observations)
    } catch (err) {
      console.error('Failed to load map observations:', err)
    } finally {
      setMapLoading(false)
    }
  }, [selectedSpecies, effectiveDates, genderFilter])

  useEffect(() => {
    if (activeTab === 'map') {
      loadMapObs()
    }
  }, [activeTab, loadMapObs])

  // Auto-fit viewport to observations
  useEffect(() => {
    if (activeTab !== 'map' || mapObs.length === 0) return
    const validObs = mapObs.filter(obs => obs.lat != null && obs.lng != null)
    if (validObs.length >= 2) {
      const lats = validObs.map(o => o.lat!)
      const lngs = validObs.map(o => o.lng!)
      setViewport(prev => ({
        ...prev,
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
        zoom: Math.min(12, prev.zoom),
      }))
    }
  }, [mapObs, activeTab])

  // Cluster markers
  const clusteredMarkers = useMemo(() => {
    if (mapObs.length === 0) return []
    const validObs = mapObs.filter(obs => obs.lat != null && obs.lng != null)
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
  }, [mapObs, debouncedViewport.zoom])

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'size', label: 'Size Frequency', icon: '📏' },
    { id: 'gender', label: 'Gender Ratio', icon: '⚤' },
    { id: 'cw50', label: 'CW50', icon: '📐' },
    { id: 'condition', label: 'Condition Index', icon: '💪' },
    { id: 'species', label: 'Species', icon: '🦀' },
    { id: 'trends', label: 'Trends', icon: '📅' },
    { id: 'map', label: 'Map', icon: '🗺️' },
  ]

  const formatMonth = (month: string): string => {
    const [y, m] = month.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[parseInt(m) - 1]} '${y.slice(2)}`
  }

  const getSpeciesName = (id: string): string => {
    const s = species.find(sp => sp.id === id)
    return s ? s.commonName : ''
  }

  const formatFilterDate = (d: string): string => {
    if (!d) return ''
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

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
              onChange={(e) => setSelectedSpecies(e.target.value)}
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
                      onClick={() => { setDateRange(r.id); setDateDropdownOpen(false) }}
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
                      onClick={() => setDateRange('custom')}
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
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="input-field text-sm py-1.5 w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
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
              onClick={() => { setSelectedSpecies(''); setDateRange(''); setCustomDateFrom(''); setCustomDateTo('') }}
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
            onClick={() => setActiveTab(tab.id)}
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

      {loading ? (
        <div className="card animate-pulse">
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      ) : activeTab === 'size' ? (
        <div className="card">
          <h2 className="text-xl font-semibold text-ocean-800 mb-2">Size-Frequency Distribution</h2>
          <p className="text-sm text-gray-500 mb-4">Carapace width distribution of approved observations</p>
          {sizeFreq.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={sizeFreq}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sizeBin" tick={{ fontSize: 11 }} angle={-45} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#0ea5e9" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available yet</p>
          )}
        </div>
      ) : activeTab === 'gender' ? (
        <div className="card">
          <h2 className="text-xl font-semibold text-ocean-800 mb-2">Gender Ratio by Species</h2>
          <p className="text-sm text-gray-500 mb-4">Male to female ratio across species</p>
          {genderRatio.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={genderRatio.map((s) => ({
                    name: s.species.split(' ').pop(),
                    value: s.male + s.female,
                    male: s.male,
                    female: s.female,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderRatio.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available yet</p>
          )}
          {genderRatio.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {genderRatio.map((s) => (
                <div key={s.species} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-ocean-800 italic">{s.species.split(' ').pop()}</p>
                  <div className="mt-2 text-sm">
                    <span className="text-blue-600">M: {s.male}</span>
                    {' | '}
                    <span className="text-pink-600">F: {s.female}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Ratio: {s.ratio === Infinity ? 'N/A' : s.ratio.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'cw50' ? (
        <div className="card">
          <h2 className="text-xl font-semibold text-ocean-800 mb-2">Size at Gender Maturity (CW50)</h2>
          <p className="text-sm text-gray-500 mb-4">Carapace width at which 50% of the population is mature</p>
          {cw50.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cw50.map((c) => (
                <div key={c.species} className="bg-gray-50 rounded-lg p-6">
                  <p className="font-medium text-ocean-800 italic">{c.species}</p>
                  <div className="mt-4 text-center">
                    <span className="text-4xl font-bold text-ocean-600">{c.cw50}</span>
                    <span className="text-gray-500 ml-1">cm</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    CI: {c.confidenceInterval[0]} - {c.confidenceInterval[1]} cm
                    {' | '}n = {c.sampleSize}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available yet</p>
          )}
        </div>
      ) : activeTab === 'condition' ? (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-ocean-800 mb-2">Condition Index (K)</h2>
            <p className="text-sm text-gray-500 mb-4">
              Health indicator: K = (BW / CW³) × 100 — higher values indicate healthier crabs
            </p>
            {conditionIndices.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={conditionIndices.map((c) => ({
                    name: c.species.split(' ').pop(),
                    'Mean K': +c.meanConditionFactor.toFixed(3),
                    'Median K': +c.medianConditionFactor.toFixed(3),
                    'Min K': +c.minConditionFactor.toFixed(3),
                    'Max K': +c.maxConditionFactor.toFixed(3),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Mean K" fill="#0ea5e9" />
                  <Bar dataKey="Median K" fill="#22c55e" />
                  <Bar dataKey="Min K" fill="#f59e0b" />
                  <Bar dataKey="Max K" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No data available yet</p>
            )}
          </div>
          {conditionIndices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {conditionIndices.map((c) => (
                <div key={c.species} className="card">
                  <p className="font-medium text-ocean-800 italic mb-3">{c.species}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Mean K:</span>
                      <p className="font-semibold text-ocean-600">{c.meanConditionFactor}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Median K:</span>
                      <p className="font-semibold text-ocean-600">{c.medianConditionFactor}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Mean CW:</span>
                      <p className="font-semibold">{c.meanCW} cm</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Mean BW:</span>
                      <p className="font-semibold">{c.meanBW} g</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Std Dev:</span>
                      <p className="font-semibold">{c.stdDevConditionFactor}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Sample:</span>
                      <p className="font-semibold">n = {c.count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'species' ? (
        <div className="card">
          <h2 className="text-xl font-semibold text-ocean-800 mb-2">Species Distribution</h2>
          <p className="text-sm text-gray-500 mb-4">Observation count per species</p>
          {speciesDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(300, speciesDist.length * 50)}>
              <BarChart data={speciesDist} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="commonName" tick={{ fontSize: 12 }} width={140} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#0ea5e9" name="Observations" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available yet</p>
          )}
          {speciesDist.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {speciesDist.map((s) => (
                <div key={s.speciesId} className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="font-medium text-ocean-800">{s.commonName}</p>
                  <p className="text-xs text-gray-500 italic">{s.species}</p>
                  <p className="text-2xl font-bold text-ocean-600 mt-2">{s.count}</p>
                  <p className="text-xs text-gray-500">observations</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'trends' ? (
        <div className="card">
          <h2 className="text-xl font-semibold text-ocean-800 mb-2">Temporal Trends</h2>
          <p className="text-sm text-gray-500 mb-4">Observation count over time</p>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={trends.map((t) => ({ ...t, month: formatMonth(t.month) }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#0ea5e9"
                  name="Observations"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available yet</p>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-xl font-semibold text-ocean-800 mb-1">Observation Map</h2>
              <p className="text-sm text-gray-500">Spatial distribution of observations</p>
            </div>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
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
                  {dateRange && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-16">Period</span>
                      <span className="font-medium">
                        {formatFilterDate(effectiveDates.from) || 'Start'} — {formatFilterDate(effectiveDates.to) || 'Now'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-16">Count</span>
                    <span className="font-medium">{mapObs.length} obs</span>
                  </div>
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
      )}
    </>
  )
}
