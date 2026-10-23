'use client'

import { useState, useEffect, memo } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { AchievementDto } from '@crabwatch/shared'
import { EngagementAdminTabProps } from './types'

export const AchievementsAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
  const t = useTranslations('admin.engagement.achievements')
  const tAdmin = useTranslations('admin')
  const [achievements, setAchievements] = useState<AchievementDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formCategory, setFormCategory] = useState('OBSERVATION')
  const [formRarity, setFormRarity] = useState('COMMON')
  const [formXpReward, setFormXpReward] = useState(0)
  const [formHidden, setFormHidden] = useState(false)
  const [formActive, setFormActive] = useState(true)
  const [awardUserId, setAwardUserId] = useState('')
  const [awardReason, setAwardReason] = useState('')
  const [awardingId, setAwardingId] = useState<string | null>(null)

  const loadAchievements = async () => {
    try {
      const data = await api.listAchievements()
      setAchievements(Array.isArray(data) ? data : [])
    } catch { /* 501 is fine */ }
    finally { setLoading(false) }
  }
  useEffect(() => { loadAchievements() }, [])

  const resetForm = () => {
    setFormCode(''); setFormName(''); setFormDesc('')
    setFormCategory('OBSERVATION'); setFormRarity('COMMON')
    setFormXpReward(0); setFormHidden(false); setFormActive(true)
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!formCode || !formName || !formDesc) { flash(tAdmin('engagement.achievementCodeNameDescRequired'), 'error'); return }
    try {
      await api.createAchievement({ code: formCode, name: formName, description: formDesc, category: formCategory, rarity: formRarity, xpReward: formXpReward, isHidden: formHidden, isActive: formActive })
      flash(tAdmin('engagement.achievementCreated'), 'success')
      resetForm(); setShowForm(false); loadAchievements()
    } catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.createFailed'), 'error') }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    try {
      await api.updateAchievement(editingId, { code: formCode, name: formName, description: formDesc, category: formCategory, rarity: formRarity, xpReward: formXpReward, isHidden: formHidden, isActive: formActive })
      flash(tAdmin('engagement.achievementUpdated'), 'success')
      resetForm(); setShowForm(false); loadAchievements()
    } catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.updateFailed'), 'error') }
  }

  const handleEdit = (a: AchievementDto) => {
    setFormCode(a.code); setFormName(a.name); setFormDesc(a.description)
    setFormCategory(a.category); setFormRarity(a.rarity || 'COMMON')
    setFormXpReward(a.xpReward || 0); setFormHidden(a.isHidden || false); setFormActive(a.isActive ?? true)
    setEditingId(a.id); setShowForm(true)
  }

  const handleDelete = async (a: AchievementDto) => {
    try { await api.deleteAchievement(a.id); flash(tAdmin('engagement.achievementDeleted'), 'success'); loadAchievements() }
    catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.deleteFailed'), 'error') }
  }

  const handleAward = async (id: string) => {
    if (!awardUserId || !awardReason) { flash(t('awardUserReasonRequired'), 'error'); return }
    try {
      await api.awardAchievement(id, awardUserId, awardReason)
      flash(tAdmin('engagement.achievementAwarded'), 'success')
      setAwardUserId(''); setAwardReason(''); setAwardingId(null)
    } catch (err: unknown) { flash(err instanceof Error ? err.message : tAdmin('engagement.awardFailed'), 'error') }
  }

  const rarityColor = (r: string) => {
    if (r === 'LEGENDARY') return 'bg-yellow-100 text-yellow-800'
    if (r === 'RARE') return 'bg-purple-100 text-purple-700'
    if (r === 'UNCOMMON') return 'bg-blue-100 text-blue-700'
    return 'bg-gray-100 text-gray-600'
  }

  if (loading) return <div className="animate-pulse"><div className="h-4 w-40 bg-gray-200 rounded" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">{t('count', { count: achievements.length })}</div>
        <button onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm">
          {showForm ? tAdmin('cancel') : t('new')}
        </button>
      </div>
      {showForm && (
        <div className="border rounded-lg p-4 mb-4 bg-gray-50">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('code')}</label>
              <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="first_crab" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('name')}</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('category')}</label>
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="OBSERVATION">{t('catObservation')}</option>
                <option value="SPECIES">{t('catSpecies')}</option>
                <option value="QUALITY">{t('catQuality')}</option>
                <option value="EXPLORATION">{t('catExploration')}</option>
                <option value="HIDDEN">{t('catHidden')}</option>
                <option value="SEASONAL">{t('catSeasonal')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('rarity')}</label>
              <select value={formRarity} onChange={(e) => setFormRarity(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="COMMON">{t('rarityCommon')}</option>
                <option value="UNCOMMON">{t('rarityUncommon')}</option>
                <option value="RARE">{t('rarityRare')}</option>
                <option value="LEGENDARY">{t('rarityLegendary')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('xpReward')}</label>
              <input type="number" value={formXpReward} onChange={(e) => setFormXpReward(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('hidden')}</label>
              <select value={formHidden ? 'yes' : 'no'} onChange={(e) => setFormHidden(e.target.value === 'yes')}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="no">{tAdmin('no')}</option>
                <option value="yes">{tAdmin('yes')}</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-600 mb-1">{t('description')}</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" rows={2} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={editingId ? handleUpdate : handleCreate}
              className="bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm">
              {editingId ? t('update') : t('create')}
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
          <th className="text-left py-2 px-3 text-gray-500">{t('category')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('rarity')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('xp')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('status')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('actions')}</th>
        </tr></thead>
        <tbody>{achievements.map((a) => (
          <tr key={a.id} className="border-b">
            <td className="py-2 px-3 font-mono text-xs">{a.code}</td>
            <td className="py-2 px-3">{a.name}</td>
            <td className="py-2 px-3 text-xs">{a.category}</td>
            <td className="py-2 px-3">
              <span className={'px-2 py-0.5 rounded-full text-xs ' + rarityColor(a.rarity || 'COMMON')}>{a.rarity || 'COMMON'}</span>
            </td>
            <td className="py-2 px-3 font-semibold">{a.xpReward}</td>
            <td className="py-2 px-3">
              <span className={'px-2 py-0.5 rounded-full text-xs ' + (a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                {a.isActive ? t('active') : t('inactive')}
              </span>
            </td>
            <td className="py-2 px-3">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleEdit(a)} className="text-xs text-ocean-600 hover:underline">{t('edit')}</button>
                <button onClick={() => handleDelete(a)} className="text-xs text-red-600 hover:underline">{t('delete')}</button>
                <button onClick={() => setAwardingId(awardingId === a.id ? null : a.id)} className="text-xs text-green-600 hover:underline">{t('award')}</button>
              </div>
              {awardingId === a.id && (
                <div className="mt-2 space-y-1">
                  <input type="text" value={awardUserId} onChange={(e) => setAwardUserId(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs" placeholder={t('userId')} />
                  <input type="text" value={awardReason} onChange={(e) => setAwardReason(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs" placeholder={t('reason')} />
                  <div className="flex gap-1">
                    <button onClick={() => handleAward(a.id)} className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">{t('confirm')}</button>
                    <button onClick={() => setAwardingId(null)} className="text-xs text-gray-500 px-2 py-0.5">{tAdmin('cancel')}</button>
                  </div>
                </div>
              )}
            </td>
          </tr>))}</tbody>
      </table>
    </div>
  )
})
AchievementsAdminSubTab.displayName = 'AchievementsAdminSubTab'
