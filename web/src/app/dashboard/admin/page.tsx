'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { SpeciesResponse, UserListResponse } from '@crabwatch/shared'

export default function AdminPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'species' | 'users'>('species')
  const [species, setSpecies] = useState<SpeciesResponse[]>([])
  const [users, setUsers] = useState<UserListResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === 'species') {
        const data = await api.listSpecies()
        setSpecies(data)
      } else {
        const data = await api.listUsers()
        setUsers(data)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadData()
  }, [activeTab, loadData])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole)
      loadData()
    } catch (err) {
      console.error('Failed to update role:', err)
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-ocean-900 mb-8">Admin Panel</h1>

      <div className="flex gap-2 mb-8 border-b">
        <button
          onClick={() => setActiveTab('species')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'species'
              ? 'text-ocean-700 border-b-2 border-ocean-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Species Management
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'text-ocean-700 border-b-2 border-ocean-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          User Management
        </button>
      </div>

      {loading ? (
        <div className="card animate-pulse">
          <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      ) : activeTab === 'species' ? (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-ocean-800">
              Species Guide
            </h2>
            <button className="btn-primary text-sm">
              + Add Species
            </button>
          </div>

          <div className="space-y-4">
            {species.map((s) => (
              <div key={s.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-ocean-800 italic">
                      {s.scientificName}
                    </h3>
                    <p className="text-gray-600">{s.commonName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-sm text-ocean-600 hover:underline">
                      Edit
                    </button>
                    <button className="text-sm text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                  {s.description}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span>{s.keyFeatures.length} features</span>
                  <span>{s.images.length} images</span>
                  <span>{s.distributionZones.length} zones</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <h2 className="text-xl font-semibold text-ocean-800 mb-6">
            User Management
          </h2>

          {users && (
            <>
              <div className="text-sm text-gray-500 mb-4">
                Total users: {users.total}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-gray-500">
                        Name
                      </th>
                      <th className="text-left py-2 px-3 text-gray-500">
                        Email
                      </th>
                      <th className="text-left py-2 px-3 text-gray-500">
                        Role
                      </th>
                      <th className="text-left py-2 px-3 text-gray-500">
                        Joined
                      </th>
                      <th className="text-left py-2 px-3 text-gray-500">
                        Change Role
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.users.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-2 px-3">{user.name}</td>
                        <td className="py-2 px-3 text-gray-500">
                          {user.email}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 bg-ocean-100 text-ocean-800 rounded-full text-xs capitalize">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="user">User</option>
                            <option value="researcher">Researcher</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
