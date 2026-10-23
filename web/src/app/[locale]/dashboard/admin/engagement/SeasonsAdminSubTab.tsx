'use client'

import { useState, useEffect, memo } from 'react'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/useFormatters'
import { api } from '@/lib/api'
import { SeasonDto } from '@crabwatch/shared'
import { EngagementAdminTabProps } from './types'

export const SeasonsAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
  const tSeasons = useTranslations('admin.engagement.seasons')
  const tAdmin = useTranslations('admin')
  const fmt = useFormatters()
  const [seasons, setSeasons] = useState<SeasonDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formStartsAt, setFormStartsAt] = useState('')
  const [formEndsAt, setFormEndsAt] = useState('')

  const loadSeasons = async () => {
    try {
      const data = await api.listSeasons()
      setSeasons(Array.isArray(data) ? data : [])
    } catch { /* 501 is fine */ }
    finally { setLoading(false) }
  }
  useEffect(() => { loadSeasons() }, [])

  const resetForm = () => {
    setFormCode(''); setFormName(''); setFormDesc('')
    setFormStartsAt(''); setFormEndsAt(''); setEditingId(null)
  }

  const handleCreate = async () => {
    if (!formCode || !formName || !formStartsAt || !formEndsAt) { flash(tSeasons('allFieldsRequired'), 'error'); return }
    try {
      await api.createSeason({ code: formCode, name: formName, description: formDesc || undefined, startsAt: formStartsAt, endsAt: formEndsAt })
      flash(tSeasons('seasonCreated'), 'success')
      resetForm(); setShowForm(false); loadSeasons()
    } catch (err: unknown) { flash(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    try {
      await api.updateSeason(editingId, { code: formCode, name: formName, description: formDesc || undefined, startsAt: formStartsAt, endsAt: formEndsAt })
      flash(tSeasons('seasonUpdated'), 'success')
      resetForm(); setShowForm(false); loadSeasons()
    } catch (err: unknown) { flash(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  const handleEdit = (s: SeasonDto) => {
    setFormCode(s.code); setFormName(s.name); setFormDesc(s.description || '')
    setFormStartsAt(s.startsAt ? new Date(s.startsAt).toISOString().slice(0, 16) : '')
    setFormEndsAt(s.endsAt ? new Date(s.endsAt).toISOString().slice(0, 16) : '')
    setEditingId(s.id); setShowForm(true)
  }

  const handleDelete = async (s: SeasonDto) => {
    try { await api.deleteSeason(s.id); flash(tSeasons('seasonDeleted'), 'success'); loadSeasons() }
    catch (err: unknown) { flash(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  const handleActivate = async (s: SeasonDto) => {
    try {
      await api.activateSeason(s.id)
      flash(tSeasons('seasonActivated'), 'success')
      loadSeasons()
    } catch (err: unknown) { flash(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  if (loading) return <div className="animate-pulse"><div className="h-4 w-40 bg-gray-200 rounded" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">{tSeasons('count', { count: seasons.length })}</div>
        <button onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm">
          {showForm ? tAdmin('cancel') : tSeasons('newSeason')}
        </button>
      </div>
      {showForm && (
        <div className="border rounded-lg p-4 mb-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{tSeasons('code')}</label>
               <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)}
                 className="w-full border rounded px-3 py-2 text-sm" placeholder="season_2024_q1" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{tSeasons('name')}</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{tSeasons('startsAt')}</label>
              <input type="datetime-local" value={formStartsAt} onChange={(e) => setFormStartsAt(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{tSeasons('endsAt')}</label>
              <input type="datetime-local" value={formEndsAt} onChange={(e) => setFormEndsAt(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{tSeasons('description')}</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" rows={2} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={editingId ? handleUpdate : handleCreate}
              className="bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm">
              {editingId ? tSeasons('update') : tSeasons('create')}
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
          <th className="text-left py-2 px-3 text-gray-500">{tSeasons('code')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{tSeasons('name')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{tSeasons('start')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{tSeasons('end')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{tSeasons('participants')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{tSeasons('status')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{tSeasons('actions')}</th>
        </tr></thead>
        <tbody>{seasons.map((s) => (
          <tr key={s.id} className="border-b">
            <td className="py-2 px-3 font-mono text-xs">{s.code}</td>
            <td className="py-2 px-3">{s.name}</td>
            <td className="py-2 px-3 text-xs text-gray-500">{fmt.formatDate(new Date(s.startsAt))}</td>
            <td className="py-2 px-3 text-xs text-gray-500">{fmt.formatDate(new Date(s.endsAt))}</td>
            <td className="py-2 px-3 text-xs">{s._count?.seasonStats || 0}</td>
            <td className="py-2 px-3">
              <span className={'px-2 py-0.5 rounded-full text-xs ' + (s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                {s.isActive ? tSeasons('active') : tSeasons('inactive')}
              </span>
            </td>
            <td className="py-2 px-3">
              <div className="flex gap-2">
                <button onClick={() => handleEdit(s)} className="text-xs text-ocean-600 hover:underline">{tSeasons('edit')}</button>
                {!s.isActive && (
                  <button onClick={() => handleActivate(s)} className="text-xs text-green-600 hover:underline">{tSeasons('activate')}</button>
                )}
                <button onClick={() => handleDelete(s)} className="text-xs text-red-600 hover:underline">{tSeasons('delete')}</button>
              </div>
            </td>
          </tr>))}</tbody>
     </table>
     </div>
)
})
SeasonsAdminSubTab.displayName = 'SeasonsAdminSubTab'
