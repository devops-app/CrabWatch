'use client'

import { memo, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import {
  SizeFrequencyData, GenderRatioData, CW50Data,
  ConditionIndexAggregatedData, SpeciesDistributionData,
  TemporalTrendData,
} from '@crabwatch/shared'

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function formatMonthLabel(month: string): string {
  const parts = month.split('-')
  if (parts.length < 2) return month
  const year = parts[0]
  const monthIndex = Number(parts[1]) - 1
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11 || year.length < 2) {
    return month
  }
  return `${months[monthIndex]} '${year.slice(2)}`
}

function formatGenderRatio(value: unknown): string {
  const ratio = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(ratio)) return 'N/A'
  return ratio.toFixed(2)
}

interface ChartTabsProps {
  sizeFreq: SizeFrequencyData[]
  genderRatio: GenderRatioData[]
  cw50: CW50Data[]
  conditionIndices: ConditionIndexAggregatedData[]
  speciesDist: SpeciesDistributionData[]
  trends: TemporalTrendData[]
  activeTab: string
}

const ChartTabs = memo(function ChartTabs({
  sizeFreq, genderRatio, cw50, conditionIndices, speciesDist, trends, activeTab,
}: ChartTabsProps): React.JSX.Element {
  const trendSeries = useMemo(() => {
    const monthTotals: Record<string, number> = {}
    for (const t of trends) {
      monthTotals[t.month] = (monthTotals[t.month] || 0) + t.count
    }
    return Object.entries(monthTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month: formatMonthLabel(month), count }))
  }, [trends])

  if (activeTab === 'size') {
    return (
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
    )
  }

  if (activeTab === 'gender') {
    return (
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
                <p className="text-xs text-gray-500 mt-1">Ratio: {formatGenderRatio(s.ratio)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (activeTab === 'cw50') {
    return (
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
    )
  }

  if (activeTab === 'condition') {
    return (
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
    )
  }

  if (activeTab === 'species') {
    return (
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
    )
  }

  if (activeTab === 'trends') {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-ocean-800 mb-2">Temporal Trends</h2>
        <p className="text-sm text-gray-500 mb-4">Observation count over time</p>
        {trendSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendSeries}>
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
    )
  }

  return <div className="card"><p className="text-gray-500 text-center py-12">Select a tab</p></div>
})

export default ChartTabs
