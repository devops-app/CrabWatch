'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import type { BackupFileInfo } from '@crabwatch/shared'

interface ConfirmState {
  title: string
  message: string
  confirmText: string
  onConfirm: () => Promise<void> | void
  danger?: boolean
  inputPlaceholder?: string
  inputLabel?: string
  requiresInput?: boolean
}

interface BackupTabProps {
  flash: (msg: string, type: 'error' | 'success') => void
  onConfirm: (state: ConfirmState) => void
}

export function BackupTab({ flash, onConfirm }: BackupTabProps): React.JSX.Element {
  const t = useTranslations('admin.backup')
  const tAdmin = useTranslations('admin')
  const [loading, setLoading] = useState(true)
  const [backupLoading, setBackupLoading] = useState(false)
  const [backups, setBackups] = useState<BackupFileInfo[]>([])

  const loadBackups = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.listBackups()
      setBackups(result)
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : t('loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [flash, t])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  const handleBackup = async () => {
    setBackupLoading(true)
    try {
      const result = await api.backupDatabase()
      flash(t('backupCreated', { file: result.fileName, size: formatSize(result.size) }), 'success')
      loadBackups()
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : t('backupFailed'), 'error')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleDeleteBackup = (backup: BackupFileInfo) => {
    onConfirm({
      title: t('confirmDelete.title'),
      message: t('confirmDelete.message', { file: backup.fileName }),
      confirmText: t('confirmDelete.confirmText'),
      danger: true,
      requiresInput: true,
      inputPlaceholder: t('confirmDelete.inputPlaceholder'),
      inputLabel: tAdmin('confirmation'),
      onConfirm: async () => {
        await api.deleteBackup(backup.fileName)
        flash(t('deletedFlash', { file: backup.fileName }), 'success')
        loadBackups()
      },
    })
  }

  const handleDownloadBackup = (backup: BackupFileInfo) => {
    api.downloadBackup(backup.fileName)
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-ocean-800 mb-6">{t('title')}</h2>

      <div className="mb-6">
        <button
          onClick={handleBackup}
          disabled={backupLoading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {backupLoading ? t('creating') : t('createNow')}
        </button>
      </div>

      {backups.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">{t('noBackupsYet')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-gray-500">{t('file')}</th>
                <th className="text-left py-2 px-3 text-gray-500">{t('size')}</th>
                <th className="text-left py-2 px-3 text-gray-500">{t('created')}</th>
                <th className="text-left py-2 px-3 text-gray-500">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.fileName} className="border-b">
                  <td className="py-2 px-3 font-mono text-xs">{backup.fileName}</td>
                  <td className="py-2 px-3">{formatSize(backup.size)}</td>
                  <td className="py-2 px-3 text-gray-500">{new Date(backup.createdAt).toLocaleString()}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDownloadBackup(backup)}
                        className="text-xs text-ocean-600 hover:underline"
                      >
                        {t('download')}
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">
        <p>{t('noteStored')}</p>
        <p className="mt-1">{t('noteCliPrefix')} <code className="bg-gray-100 px-1 rounded">pnpm backup:db</code></p>
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function LoadingSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  )
}
