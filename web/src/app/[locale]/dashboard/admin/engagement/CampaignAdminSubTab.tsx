'use client'

import { useState, useEffect, memo } from 'react'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/useFormatters'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { CampaignDto } from '@crabwatch/shared'
import { EngagementAdminTabProps } from './types'

export const CampaignAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
  const t = useTranslations('admin.engagement.campaigns')
  const tAdmin = useTranslations('admin')
  const fmt = useFormatters()
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formChannel, setFormChannel] = useState('PUSH')
  const [formTitleEn, setFormTitleEn] = useState('')
  const [formTitleMs, setFormTitleMs] = useState('')
  const [formBodyEn, setFormBodyEn] = useState('')
  const [formBodyMs, setFormBodyMs] = useState('')
  const [formMinLevel, setFormMinLevel] = useState(1)

  const loadCampaigns = async () => {
    try { const data = await api.listCampaigns(); setCampaigns(Array.isArray(data) ? data : []) } catch (err) { logger.error('Failed to load campaigns', err) } finally { setLoading(false) }
  }
  useEffect(() => { loadCampaigns() }, [])

  const handleCreate = async () => {
    if (!formCode || !formName || !formTitleEn || !formBodyEn) { flash(tAdmin('engagement.allFieldsRequired'), 'error'); return }
    try {
      const content: Record<string, { title: string; body: string }> = {
        en: { title: formTitleEn, body: formBodyEn },
      }
      if (formTitleMs && formBodyMs) {
        content.ms = { title: formTitleMs, body: formBodyMs }
      }
      await api.createCampaign({ code: formCode, name: formName, channel: formChannel,
        audienceFilter: { minLevel: formMinLevel }, content })
      flash(tAdmin('engagement.campaignCreated'), 'success')
      setShowForm(false); setFormCode(''); setFormName(''); setFormTitleEn(''); setFormTitleMs(''); setFormBodyEn(''); setFormBodyMs('')
      loadCampaigns()
    } catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.createFailed'), 'error') }
  }

  const handleLaunch = async (id: string) => {
    try { const data = await api.launchCampaign(id) as { sent?: number }; flash(tAdmin('engagement.campaignLaunched', { sent: data.sent || 0 }), 'success'); loadCampaigns() }
    catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.launchFailed'), 'error') }
  }

  const [testUserId, setTestUserId] = useState('')
  const [testingCampaignId, setTestingCampaignId] = useState<string | null>(null)

  const handleSendTest = async (id: string) => {
    if (!testUserId) { flash(tAdmin('engagement.testSendRequired'), 'error'); return }
    try {
      setTestingCampaignId(id)
      await api.sendTestCampaign(id, testUserId)
      flash(tAdmin('engagement.testSent'), 'success')
      setTestingCampaignId(null)
    } catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.testFailed'), 'error') }
    finally { setTestingCampaignId(null) }
  }

  const handleDelete = async (id: string) => {
    try { await api.deleteCampaign(id); flash(tAdmin('engagement.campaignDeleted'), 'success'); loadCampaigns() }
    catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.deleteFailed'), 'error') }
  }

  const statusColor = (s: string) => {
    if (s === 'DRAFT') return 'bg-gray-100 text-gray-700'
    if (s === 'SCHEDULED') return 'bg-blue-100 text-blue-700'
    if (s === 'ACTIVE') return 'bg-green-100 text-green-700'
    if (s === 'COMPLETED') return 'bg-purple-100 text-purple-700'
    return 'bg-gray-100 text-gray-600'
  }

  if (loading) return <div className="animate-pulse"><div className="h-4 w-40 bg-gray-200 rounded" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">{t('count', { count: campaigns.length })}</div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm">
          {showForm ? tAdmin('cancel') : t('new')}
        </button>
      </div>
      {showForm && (
        <div className="border rounded-lg p-4 mb-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('code')}</label>
              <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="welcome_back_2024" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('name')}</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('channel')}</label>
              <select value={formChannel} onChange={(e) => setFormChannel(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="PUSH">{t('channelPush')}</option>
                <option value="EMAIL">{t('channelEmail')}</option>
                <option value="IN_APP">{t('channelInApp')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('minLevel')}</label>
              <input type="number" value={formMinLevel} onChange={(e) => setFormMinLevel(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{t('titleEn')}</label>
              <input type="text" value={formTitleEn} onChange={(e) => setFormTitleEn(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{t('bodyEn')}</label>
              <textarea value={formBodyEn} onChange={(e) => setFormBodyEn(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" rows={2} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{t('titleMs')}</label>
              <input type="text" value={formTitleMs} onChange={(e) => setFormTitleMs(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{t('bodyMs')}</label>
              <textarea value={formBodyMs} onChange={(e) => setFormBodyMs(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" rows={2} />
            </div>
          </div>
          <button onClick={handleCreate} className="mt-3 bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm">{t('createBtn')}</button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead><tr className="border-b">
          <th className="text-left py-2 px-3 text-gray-500">{t('code')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('name')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('channel')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('status')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('created')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('actions')}</th>
        </tr></thead>
        <tbody>{campaigns.map((c) => (
          <tr key={c.id} className="border-b">
            <td className="py-2 px-3 font-mono text-xs">{c.code}</td>
            <td className="py-2 px-3">{c.name}</td>
            <td className="py-2 px-3 text-xs">{c.channel}</td>
            <td className="py-2 px-3">
              <span className={'px-2 py-0.5 rounded-full text-xs ' + statusColor(c.status)}>{c.status}</span>
            </td>
            <td className="py-2 px-3 text-gray-500">{fmt.formatDate(new Date(c.createdAt))}</td>
            <td className="py-2 px-3">
                <div className="flex gap-2 flex-wrap">
                  {c.status === 'DRAFT' && (
                    <button onClick={() => handleLaunch(c.id)} className="text-xs text-green-600 hover:underline">{t('launch')}</button>
                  )}
                  <button onClick={() => setTestingCampaignId(testingCampaignId === c.id ? null : c.id)} className="text-xs text-blue-600 hover:underline">{t('test')}</button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-red-600 hover:underline">{t('delete')}</button>
                </div>
                {testingCampaignId === c.id && (
                  <div className="mt-2 space-y-1">
                    <input type="text" value={testUserId} onChange={(e) => setTestUserId(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs" placeholder={t('testUserId')} />
                    <div className="flex gap-1">
                      <button onClick={() => handleSendTest(c.id)} disabled={testingCampaignId !== c.id}
                        className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded disabled:opacity-50">{t('send')}</button>
                      <button onClick={() => { setTestingCampaignId(null); setTestUserId('') }}
                        className="text-xs text-gray-500 px-2 py-0.5">{tAdmin('cancel')}</button>
                    </div>
                  </div>
                )}
            </td>
          </tr>))}</tbody>
      </table>
    </div>
  )
})
CampaignAdminSubTab.displayName = 'CampaignAdminSubTab'
