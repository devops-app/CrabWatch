'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { BackupResult, BackupFileInfo } from '@crabwatch/shared'

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
  const [loading, setLoading] = useState(true)
  const [backupLoading, setBackupLoading] = useState(false)
  const [lastBackup, setLastBackup] = useState<BackupResult | null>(null)
  const [backups, setBackups] = useState<BackupFileInfo[]>([])

  const loadBackups = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.listBackups()
      setBackups(result)
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Failed to load backups', 'error')
    } finally {
      setLoading(false)
    }
  }, [flash])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  const handleBackup = async () => {
    setBackupLoading(true)
    try {
      const result = await api.backupDatabase()
      setLastBackup(result)
      flash(`Backup created: ${result.fileName} (${formatSize(result.size)})`, 'success')
      loadBackups()
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Backup failed', 'error')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleDeleteBackup = (backup: BackupFileInfo) => {
    onConfirm({
      title: 'Delete Backup',
      message: `Are you sure you want to delete "${backup.fileName}"? This action cannot be undone. Type "delete" to confirm.`,
      confirmText: 'Delete Backup',
      danger: true,
      requiresInput: true,
      inputPlaceholder: 'Type "delete" to confirm',
      inputLabel: 'Confirmation',
      onConfirm: async () => {
        await api.deleteBackup(backup.fileName)
        flash(`Deleted: ${backup.fileName}`, 'success')
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
      <h2 className="text-xl font-semibold text-ocean-800 mb-6">Database Backup</h2>

      <div className="mb-6">
        <button
          onClick={handleBackup}
          disabled={backupLoading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {backupLoading ? 'Creating Backup...' : 'Create Backup Now'}
        </button>
      </div>

      {backups.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">No backups yet. Create one to get started.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-gray-500">File</th>
                <th className="text-left py-2 px-3 text-gray-500">Size</th>
                <th className="text-left py-2 px-3 text-gray-500">Created</th>
                <th className="text-left py-2 px-3 text-gray-500">Actions</th>
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
                        Download
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
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
        <p>Backups are stored as gzip-compressed JSON files on the server.</p>
        <p className="mt-1">Use the CLI command <code className="bg-gray-100 px-1 rounded">pnpm backup:db</code> for scheduled backups.</p>
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
