'use client'

import { useState, useEffect, memo } from 'react'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/useFormatters'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { AbuseSignalDto } from '@crabwatch/shared'
import { EngagementAdminTabProps } from './types'

export const AbuseAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
  const t = useTranslations('admin.engagement.abuse')
  const tAdmin = useTranslations('admin')
  const fmt = useFormatters()
  const [signals, setSignals] = useState<AbuseSignalDto[]>([])
  const [loading, setLoading] = useState(true)

  const loadSignals = async () => {
    try { const data = await api.getAbuseSignals(); setSignals(Array.isArray(data) ? data : []) }
    catch { logger.error('Failed to load abuse signals') }
    finally { setLoading(false) }
  }
  useEffect(() => { loadSignals() }, [])

  const handleResolve = async (signal: AbuseSignalDto) => {
    try {
      await api.resolveAbuseSignal(signal.id, 'Admin reviewed')
      flash(tAdmin('engagement.signalResolved'), 'success')
      loadSignals()
    } catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.resolveFailed'), 'error') }
  }

  const scoreColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600'
    if (score >= 0.5) return 'text-orange-600'
    return 'text-green-600'
  }

  if (loading) return <div className="animate-pulse"><div className="h-4 w-40 bg-gray-200 rounded" /></div>

  return (
    <div>
      <div className="text-sm text-gray-500 mb-4">{t('count', { count: signals.length })}</div>
      {signals.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">{t('noneDetected')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="border-b">
            <th className="text-left py-2 px-3 text-gray-500">{t('user')}</th>
            <th className="text-left py-2 px-3 text-gray-500">{t('type')}</th>
            <th className="text-left py-2 px-3 text-gray-500">{t('score')}</th>
            <th className="text-left py-2 px-3 text-gray-500">{t('details')}</th>
            <th className="text-left py-2 px-3 text-gray-500">{t('status')}</th>
            <th className="text-left py-2 px-3 text-gray-500">{t('actions')}</th>
          </tr></thead>
          <tbody>{signals.map(signal => (
            <tr key={signal.id} className="border-b">
              <td className="py-2 px-3 font-mono text-xs">{signal.userId?.slice(0, 8)}</td>
              <td className="py-2 px-3 text-xs">{signal.type}</td>
              <td className={'py-2 px-3 font-bold ' + scoreColor(signal.riskScore || 0)}>
                {fmt.formatInt((signal.riskScore || 0) * 100)}%
              </td>
              <td className="py-2 px-3 text-gray-500 text-xs">{signal.summary || '-'}</td>
              <td className="py-2 px-3">
                <span className={'px-2 py-0.5 rounded-full text-xs ' +
                  (signal.resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {signal.resolved ? t('resolved') : t('open')}
                </span>
              </td>
              <td className="py-2 px-3">
                {!signal.resolved && (
                  <button onClick={() => handleResolve(signal)} className="text-xs text-ocean-600 hover:underline">
                    {t('resolve')}
                  </button>
                )}
              </td>
            </tr>))}</tbody>
        </table>
      )}
    </div>
  )
})
AbuseAdminSubTab.displayName = 'AbuseAdminSubTab'
