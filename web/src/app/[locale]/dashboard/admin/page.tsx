'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { SpeciesTab } from './species-tab'
import { UsersTab } from './users-tab'
import { BackupTab } from './backup-tab'
import { TranslationsTab } from './translation-tab'

const EngagementAdminTab = dynamic(() => import('./components').then(m => ({ default: m.EngagementAdminTab })), {
  ssr: false,
  loading: () => <EngagementLoading />,
})

function EngagementLoading() {
  const t = useTranslations('admin')
  return <div className="card py-12 text-center text-gray-400">{t('engagement.loadingEngagement')}</div>
}

type Tab = 'species' | 'users' | 'backup' | 'engagement' | 'translations'

interface ConfirmState {
  open: boolean
  title: string
  message: string
  confirmText: string
  onConfirm: () => Promise<void> | void
  danger?: boolean
  inputPlaceholder?: string
  inputLabel?: string
  requiresInput?: boolean
  infoOnly?: boolean
}

export default function AdminPage(): React.JSX.Element {
  const t = useTranslations('admin')
  const [activeTab, setActiveTab] = useState<Tab>('species')
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmText: '',
    onConfirm: () => {},
  })
  const [confirmInput, setConfirmInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const flash = (msg: string, type: 'error' | 'success') => {
    if (type === 'error') {
      setError(msg)
      setTimeout(() => setError(''), 5000)
    } else {
      setSuccess(msg)
      setTimeout(() => setSuccess(''), 5000)
    }
  }

  const openConfirm = (state: Omit<ConfirmState, 'open'>) => {
    setConfirm({ ...state, open: true })
    setConfirmInput('')
  }

  const closeConfirm = () => {
    setConfirm((prev) => ({ ...prev, open: false }))
    setConfirmInput('')
    setActionLoading(false)
  }

  const handleConfirm = async () => {
    if (confirm.requiresInput && !confirmInput.trim()) {
      return
    }
    if (confirm.infoOnly) {
      closeConfirm()
      return
    }
    setActionLoading(true)
    try {
      await confirm.onConfirm()
      flash(t('actionCompleted'), 'success')
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : t('actionFailed'), 'error')
    } finally {
      closeConfirm()
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'species', label: t('tabs.species') },
    { key: 'users', label: t('tabs.users') },
    { key: 'backup', label: t('tabs.backup') },
    { key: 'engagement', label: t('tabs.engagement') },
    { key: 'translations', label: t('tabs.translations') },
  ]

  return (
    <>
      <h1 className="text-3xl font-bold text-ocean-900 mb-8">{t('title')}</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="flex gap-2 mb-8 border-b flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-ocean-700 border-b-2 border-ocean-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'species' && (
        <SpeciesTab flash={flash} onConfirm={openConfirm} onReload={() => {}} />
      )}
      {activeTab === 'users' && (
        <UsersTab flash={flash} onConfirm={openConfirm} onReload={() => {}} />
      )}
      {activeTab === 'backup' && (
        <BackupTab flash={flash} onConfirm={openConfirm} />
      )}
      {activeTab === 'engagement' && (
        <EngagementAdminTab flash={flash} />
      )}
      {activeTab === 'translations' && (
        <TranslationsTab flash={flash} />
      )}

      {confirm.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h3 className={`text-lg font-semibold mb-3 ${confirm.danger ? 'text-red-700' : 'text-ocean-900'}`}>
              {confirm.title}
            </h3>
            <p className="text-sm text-gray-600 mb-4">{confirm.message}</p>

            {confirm.requiresInput && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">{confirm.inputLabel}</label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={confirm.inputPlaceholder}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    confirm.danger
                      ? 'focus:ring-red-400 border-red-300'
                      : 'focus:ring-ocean-400 border-gray-300'
                  }`}
                  autoFocus
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={closeConfirm}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={actionLoading || (confirm.requiresInput && !confirmInput.trim())}
                className={`px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 ${
                  confirm.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-ocean-600 hover:bg-ocean-700'
                }`}
              >
                {actionLoading ? t('processing') : confirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
