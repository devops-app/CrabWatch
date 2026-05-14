'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/authStore'
import { DashboardStats, ObservationResponse } from '@crabwatch/shared'
import Link from 'next/link'

export default function DashboardPage(): React.JSX.Element {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<ObservationResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadStats(), loadRecent()])
  }, [])

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats()
      setStats(data)
    } catch {
      console.error('Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  const loadRecent = async () => {
    try {
      const data = await api.listObservations({ limit: 5 })
      setRecent(data.observations)
    } catch {
      console.error('Failed to load recent observations')
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-ocean-900 mb-8">Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-8 w-8 bg-gray-200 rounded-full mb-2" />
              <div className="h-4 w-20 bg-gray-200 rounded mb-1" />
              <div className="h-6 w-12 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card">
            <div className="text-3xl font-bold text-ocean-600">
              {stats?.totalObservations ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Total Observations
            </div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold text-mangrove-600">
              {stats?.approvedObservations ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Approved
            </div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold text-amber-600">
              {stats?.pendingObservations ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Pending Review
            </div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold text-ocean-600">
              {stats?.totalSpecies ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Species Recorded
            </div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold text-ocean-600">
              {stats?.totalContributors ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Contributors
            </div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold text-ocean-600">
              {stats?.statesCovered ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              States Covered
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/capture" className="card hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-ocean-800 mb-2">
            Guided Capture
          </h2>
          <p className="text-gray-600">
            Use camera flow for dorsal, ventral, and close-up photos
          </p>
        </Link>

        {(user?.role === 'researcher' || user?.role === 'admin') && (
          <Link href="/dashboard/researcher" className="card hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-ocean-800 mb-2">
              Validation Queue
            </h2>
            <p className="text-gray-600">
              Review and validate pending observations
            </p>
          </Link>
        )}

        <Link href="/dashboard/analytics" className="card hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-ocean-800 mb-2">
            Analytics
          </h2>
          <p className="text-gray-600">
            View population data and trends
          </p>
        </Link>

        {user?.role === 'admin' && (
          <Link href="/dashboard/admin" className="card hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-ocean-800 mb-2">
              Admin Panel
            </h2>
            <p className="text-gray-600">
              Manage species, users, and settings
            </p>
          </Link>
        )}
      </div>

      {/* Recent Submissions */}
      <div className="card mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-ocean-800">Recent Submissions</h2>
          <Link href="/dashboard/researcher" className="text-sm text-ocean-600 hover:underline">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">No observations yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Species</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Researcher</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">CW</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Gender</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((obs) => (
                  <tr
                    key={obs.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <Link href={`/dashboard/observation/${obs.id}`} className="text-ocean-700 hover:underline font-medium">
                        {obs.species.commonName || obs.species.scientificName}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{obs.user.name}</td>
                    <td className="py-2.5 px-3 text-gray-600">{obs.cw.toFixed(1)} cm</td>
                    <td className="py-2.5 px-3 capitalize text-gray-600">{obs.gender}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        obs.status === 'approved' ? 'bg-green-100 text-green-800' :
                        obs.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {obs.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">
                      {new Date(obs.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
