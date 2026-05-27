'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import type { NotificationPreferenceDto } from '@crabwatch/shared'

const CHANNELS = ['PUSH', 'EMAIL', 'IN_APP'] as const
const CATEGORIES = [
  { key: 'mission_reminders', i18nKey: 'missionReminders' },
  { key: 'streak_warnings', i18nKey: 'streakWarnings' },
  { key: 'milestone_alerts', i18nKey: 'milestoneAlerts' },
  { key: 'community_updates', i18nKey: 'communityUpdates' },
] as const

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Bahasa Melayu' },
] as const

interface SettingsClientProps {
  initialPrefs?: NotificationPreferenceDto[] | null
}

export function SettingsClient({ initialPrefs }: SettingsClientProps): React.JSX.Element {
  const t = useTranslations('settings')
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const currentLocale = (params.locale as string) || 'en'
  const [prefs, setPrefs] = useState<NotificationPreferenceDto[]>(initialPrefs ?? [])
  const [loading, setLoading] = useState(!initialPrefs)
  const [language, setLanguage] = useState(currentLocale)
  const [languageSaving, setLanguageSaving] = useState(false)
  const [languageSaved, setLanguageSaved] = useState(false)

  useEffect(() => {
    if (initialPrefs) return
    let cancelled = false
    setLoading(true)
    api.getNotificationPreferences().then(p => {
      if (!cancelled) {
        setPrefs(Array.isArray(p) ? p : [])
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setLanguage(currentLocale)
  }, [currentLocale])

  const handleLanguageChange = async (newLocale: 'en' | 'ms') => {
    setLanguageSaving(true)
    setLanguageSaved(false)
    setErrorMessage('')
    try {
      await api.updateProfile({ preferredLocale: newLocale })
      setLanguageSaved(true)
      setTimeout(() => setLanguageSaved(false), 3000)
    } catch {
      setErrorMessage(t('languageSaveFailed'))
    } finally {
      setLanguageSaving(false)
    }

    if (newLocale !== currentLocale) {
      if (typeof window !== 'undefined') {
        const normalizedPath = window.location.pathname.replace(/^\/(en|ms)(?=\/|$)/, '')
        const targetPath = `/${newLocale}${normalizedPath || ''}${window.location.search}${window.location.hash}`
        window.location.assign(targetPath)
        return
      }
      router.replace(pathname, { locale: newLocale })
    }
  }
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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
      setErrorMessage(`${t('saveFailed')}: ${message}`)
      setPrefs(initialPrefs ?? [])
    } finally {
      setSaving(false)
    }
  }

  const getEnabled = (channel: string, category: string) => {
    const p = prefs.find(p => p.channel === channel && p.category === category)
    return p?.enabled ?? false
  }

  const channelLabel = (ch: string) => {
    if (ch === 'PUSH') return t('channels.push')
    if (ch === 'EMAIL') return t('channels.email')
    return t('channels.inApp')
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-ocean-200 border-t-ocean-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">{t('saving')}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-ocean-900 mb-8">{t('title')}</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-ocean-800 mb-2">{t('language')}</h2>
        <p className="text-sm text-gray-500 mb-4">{t('languageDesc')}</p>
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMessage}
          </div>
        )}
        <div className="flex items-center gap-4">
          {LOCALES.map(loc => (
            <button
              key={loc.code}
              onClick={() => handleLanguageChange(loc.code)}
              disabled={languageSaving}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                language === loc.code
                  ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                  : 'border-gray-200 text-gray-600 hover:border-ocean-300'
              } disabled:opacity-50`}
            >
              {loc.label}
            </button>
          ))}
          {languageSaving && <span className="text-sm text-gray-500">{t('languageSaving')}</span>}
          {languageSaved && <span className="text-sm text-emerald-600">{t('languageSaved')}</span>}
        </div>
      </div>

      <div className="card">
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMessage}
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-ocean-800">{t('notificationPreferences')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('notificationDesc')}</p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm disabled:opacity-50"
          >
            {saving ? t('saving') : saved ? t('saved') : t('savePreferences')}
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 text-gray-500 font-medium">{t('notification')}</th>
              {CHANNELS.map(ch => (
                <th key={ch} className="text-center py-3 px-3 text-gray-500 font-medium">
                  {channelLabel(ch)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => (
              <tr key={cat.key} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-3 font-medium text-ocean-800">{t(`categories.${cat.i18nKey}`)}</td>
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
                        aria-label={`${t(`categories.${cat.i18nKey}`)} - ${channelLabel(ch)}`}
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
