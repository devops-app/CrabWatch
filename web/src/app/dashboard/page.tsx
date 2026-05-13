'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/authStore'
import { DashboardStats } from '@crabwatch/shared'
import Link from 'next/link'

export default function DashboardPage(): React.JSX.Element {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
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
    </>
  )
}
