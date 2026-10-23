'use client'

import { useState, useEffect, memo } from 'react'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/useFormatters'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { AdminAuditLogDto } from '@crabwatch/shared'
import { EngagementAdminTabProps } from './types'

export const AuditAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
  const t = useTranslations('admin.engagement.auditLog')
  const fmt = useFormatters()
  const [logs, setLogs] = useState<AdminAuditLogDto[]>([])
  const [stats, setStats] = useState<{ totalEntries: number; xpAdjustments: number; campaignLaunches: number; abuseResolutions: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const [logData, statsData] = await Promise.all([
        api.getAuditLogs({ limit: 20 }),
        api.getAuditLogStats(),
      ])
      const logsData = logData as AdminAuditLogDto[] | { items: AdminAuditLogDto[]; totalPages: number }
      setLogs(Array.isArray(logsData) ? logsData : (logsData.items || []))
      setStats(statsData as typeof stats)
      setTotalPages((logsData as { totalPages?: number })?.totalPages || 1)
    } catch { logger.error('Failed to load audit logs') }
    finally { setLoading(false) }
  }
  useEffect(() => { loadLogs() }, [page])

  return (
    <div>
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-ocean-800">{stats.totalEntries || 0}</div>
            <div className="text-xs text-gray-500">{t('totalEntries')}</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.xpAdjustments || 0}</div>
            <div className="text-xs text-gray-500">{t('xpAdjustments')}</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.campaignLaunches || 0}</div>
            <div className="text-xs text-gray-500">{t('campaignLaunches')}</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.abuseResolutions || 0}</div>
            <div className="text-xs text-gray-500">{t('abuseResolutions')}</div>
          </div>
        </div>
      )}
      {loading ? (
        <div className="animate-pulse"><div className="h-4 w-40 bg-gray-200 rounded" /></div>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead><tr className="border-b">
              <th className="text-left py-2 px-3 text-gray-500">{t('time')}</th>
              <th className="text-left py-2 px-3 text-gray-500">{t('actor')}</th>
              <th className="text-left py-2 px-3 text-gray-500">{t('action')}</th>
              <th className="text-left py-2 px-3 text-gray-500">{t('details')}</th>
            </tr></thead>
            <tbody>{logs.map(log => (
              <tr key={log.id} className="border-b">
                <td className="py-2 px-3 text-gray-500 text-xs">{fmt.formatDateTime(new Date(log.createdAt))}</td>
                <td className="py-2 px-3 font-mono text-xs">{log.actorType}: {log.actorId?.slice(0, 8)}</td>
                <td className="py-2 px-3 font-medium">{log.action}</td>
                <td className="py-2 px-3 text-gray-500 text-xs">{log.reason || '-'}</td>
              </tr>))}</tbody>
          </table>
          <div className="flex justify-center gap-2 mt-4">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50">{t('prev')}</button>
            <span className="px-3 py-1 text-sm">{t('pageOf', { current: page, total: totalPages })}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50">{t('next')}</button>
          </div>
        </>
      )}
    </div>
  )
})
AuditAdminSubTab.displayName = 'AuditAdminSubTab'
