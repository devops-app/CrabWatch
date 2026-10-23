'use client'

import { useState, useEffect, memo } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { MissionDto, AchievementCondition } from '@crabwatch/shared'
import { EngagementAdminTabProps } from './types'

export const MissionsAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
  const t = useTranslations('admin.engagement.missions')
  const tAdmin = useTranslations('admin')
  const [missions, setMissions] = useState<MissionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formCadence, setFormCadence] = useState<'DAILY' | 'WEEKLY'>('DAILY')
  const [formXpReward, setFormXpReward] = useState(0)
  const [formMaxClaims, setFormMaxClaims] = useState(1)
  const [formActive, setFormActive] = useState(true)
  const [formCriteria, setFormCriteria] = useState('')

  const loadMissions = async () => {
    try {
      const data = await api.listAdminMissions()
      setMissions(Array.isArray(data) ? data : [])
    } catch (err) {
      logger.warn('Missions load failed (feature may be disabled)', err)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadMissions() }, [])

  const resetForm = () => {
    setFormCode(''); setFormName(''); setFormDesc('')
    setFormCadence('DAILY'); setFormXpReward(0); setFormMaxClaims(1); setFormActive(true)
    setFormCriteria(''); setEditingId(null)
  }

  const handleCreate = async () => {
    if (!formCode || !formName || !formDesc || !formCriteria) { flash(tAdmin('engagement.missionAllFieldsRequired'), 'error'); return }
    try {
      let criteria: AchievementCondition[]
      try { criteria = JSON.parse(formCriteria) } catch { flash(tAdmin('engagement.criteriaInvalidJson'), 'error'); return }
      await api.createMission({ code: formCode, name: formName, description: formDesc, cadence: formCadence, criteria, xpReward: formXpReward, maxClaimsPerUser: formMaxClaims, active: formActive })
      flash(tAdmin('engagement.missionCreated'), 'success')
      resetForm(); setShowForm(false); loadMissions()
    } catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.createFailed'), 'error') }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    try {
      let criteria: AchievementCondition[]
      try { criteria = JSON.parse(formCriteria) } catch { flash(tAdmin('engagement.criteriaInvalidJson'), 'error'); return }
      await api.updateMission(editingId, { code: formCode, name: formName, description: formDesc, cadence: formCadence, criteria, xpReward: formXpReward, maxClaimsPerUser: formMaxClaims, active: formActive })
      flash(tAdmin('engagement.missionUpdated'), 'success')
      resetForm(); setShowForm(false); loadMissions()
    } catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.updateFailed'), 'error') }
  }

  const handleEdit = (m: MissionDto) => {
    setFormCode(m.code); setFormName(m.name); setFormDesc(m.description)
    setFormCadence(m.cadence); setFormXpReward(m.xpReward || 0); setFormMaxClaims(m.maxClaimsPerUser || 1); setFormActive(m.active ?? true)
    setFormCriteria(JSON.stringify(m.criteria, null, 2))
    setEditingId(m.id); setShowForm(true)
  }

  const handleDelete = async (m: MissionDto) => {
    try { await api.deleteMission(m.id); flash(tAdmin('engagement.missionDeleted'), 'success'); loadMissions() }
    catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.deleteFailed'), 'error') }
  }

  const handleToggle = async (m: MissionDto) => {
    try {
      await api.updateMission(m.id, { active: !m.active })
      flash(tAdmin('engagement.missionToggled'), 'success')
      loadMissions()
    } catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.toggleFailed'), 'error') }
  }

  if (loading) return <div className="animate-pulse"><div className="h-4 w-40 bg-gray-200 rounded" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">{t('count', { count: missions.length })}</div>
        <button onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm">
          {showForm ? tAdmin('cancel') : t('newMission')}
        </button>
      </div>
      {showForm && (
        <div className="border rounded-lg p-4 mb-4 bg-gray-50">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('code')}</label>
              <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" placeholder={t('codePlaceholder')} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('name')}</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('cadence')}</label>
              <select value={formCadence} onChange={(e) => setFormCadence(e.target.value as 'DAILY' | 'WEEKLY')}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="DAILY">{t('daily')}</option>
                <option value="WEEKLY">{t('weekly')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('xpReward')}</label>
              <input type="number" value={formXpReward} onChange={(e) => setFormXpReward(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('maxClaims')}</label>
              <input type="number" value={formMaxClaims} onChange={(e) => setFormMaxClaims(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('active')}</label>
              <select value={formActive ? 'yes' : 'no'} onChange={(e) => setFormActive(e.target.value === 'yes')}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="yes">{t('yes')}</option>
                <option value="no">{t('no')}</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-600 mb-1">{t('description')}</label>
              <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-600 mb-1">{t('criteria')}</label>
              <textarea value={formCriteria} onChange={(e) => setFormCriteria(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm font-mono" rows={3}
                placeholder={t('criteriaPlaceholder')} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={editingId ? handleUpdate : handleCreate}
              className="bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm">
              {editingId ? t('updateMission') : t('createMission')}
            </button>
            {editingId && (
              <button onClick={() => { resetForm(); setShowForm(false) }}
                className="text-gray-500 px-4 py-2 text-sm">{tAdmin('cancel')}</button>
            )}
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead><tr className="border-b">
          <th className="text-left py-2 px-3 text-gray-500">{t('code')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('name')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('cadence')}</th>
          <th className="text-left py-2 px-3 text-gray-500">XP</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('maxClaims')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('active')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('actions')}</th>
        </tr></thead>
        <tbody>{missions.map((m) => (
          <tr key={m.id} className="border-b">
            <td className="py-2 px-3 font-mono text-xs">{m.code}</td>
            <td className="py-2 px-3">{m.name}</td>
            <td className="py-2 px-3">
              <span className={'px-2 py-0.5 rounded-full text-xs ' + (m.cadence === 'WEEKLY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>
                {m.cadence}
              </span>
            </td>
            <td className="py-2 px-3 font-semibold">{m.xpReward}</td>
            <td className="py-2 px-3">{m.maxClaimsPerUser}</td>
            <td className="py-2 px-3">
              <button onClick={() => handleToggle(m)}
                className={'px-2 py-0.5 rounded-full text-xs ' + (m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                {m.active ? t('active') : t('inactive')}
              </button>
            </td>
            <td className="py-2 px-3">
              <div className="flex gap-2">
                <button onClick={() => handleEdit(m)} className="text-xs text-ocean-600 hover:underline">{t('edit')}</button>
                <button onClick={() => handleDelete(m)} className="text-xs text-red-600 hover:underline">{t('delete')}</button>
              </div>
            </td>
          </tr>))}</tbody>
      </table>
    </div>
  )
})
MissionsAdminSubTab.displayName = 'MissionsAdminSubTab'
