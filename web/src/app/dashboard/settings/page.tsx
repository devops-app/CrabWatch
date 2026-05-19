'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { NotificationPreferenceDto } from '@crabwatch/shared'

const CHANNELS = ['PUSH', 'EMAIL', 'IN_APP'] as const
const CATEGORIES = [
  { key: 'mission_reminders', label: 'Mission Reminders' },
  { key: 'streak_warnings', label: 'Streak Warnings' },
  { key: 'milestone_alerts', label: 'Milestone Alerts' },
  { key: 'community_updates', label: 'Community Updates' },
] as const


export default function SettingsPage(): React.JSX.Element {
  const [prefs, setPrefs] = useState<NotificationPreferenceDto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    loadPrefs()
  }, [])

  const loadPrefs = async () => {
    try {
      const data = await api.getNotificationPreferences()
      setPrefs(Array.isArray(data) ? data : [])
      setErrorMessage('')
    } catch {
      setErrorMessage('Failed to load preferences. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (channel: string, category: string) => {
    setPrefs(prev => prev.map(p =>
      p.channel === channel && p.category === category
        ? { ...p, enabled: !p.enabled }
        : p
    ))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setErrorMessage('')
    try {
      await api.updateNotificationPreferences({ updates: prefs })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMessage(`Failed to save preferences: ${message}`)
      await loadPrefs()
    } finally {
      setSaving(false)
    }
  }

  const getEnabled = (channel: string, category: string) => {
    const p = prefs.find(p => p.channel === channel && p.category === category)
    return p?.enabled ?? false
  }

  if (loading) {
    return (
      <>
        <h1 className="text-3xl font-bold text-ocean-900 mb-8">Settings</h1>
        <div className="card animate-pulse">
          <div className="h-4 w-48 bg-gray-200 rounded mb-6" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded mb-3" />
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-ocean-900 mb-8">Settings</h1>

      <div className="card">
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMessage}
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-ocean-800">Notification Preferences</h2>
            <p className="text-sm text-gray-500 mt-1">Choose which notifications you receive and how</p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 text-gray-500 font-medium">Notification</th>
              {CHANNELS.map(ch => (
                <th key={ch} className="text-center py-3 px-3 text-gray-500 font-medium">
                  {ch === 'PUSH' ? 'Push' : ch === 'EMAIL' ? 'Email' : 'In-App'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => (
              <tr key={cat.key} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-3 font-medium text-ocean-800">{cat.label}</td>
                {CHANNELS.map(ch => {
                  const enabled = getEnabled(ch, cat.key)
                  return (
                    <td key={ch} className="text-center py-3 px-3">
                      <button
                        onClick={() => toggle(ch, cat.key)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          enabled ? 'bg-ocean-600' : 'bg-gray-300'
                        }`}
                        role="switch"
                        aria-checked={enabled}
                        aria-label={`${cat.label} - ${ch}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
