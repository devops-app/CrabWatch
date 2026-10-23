'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/useFormatters'
import { LevelConfigDto } from '@crabwatch/shared'

export const LevelsTab = memo(({
  levels,
  draft,
  saving,
  isEditing,
  onDraftChange,
  onSave,
  onEdit,
  onCancel,
  onDelete,
}: {
  levels: LevelConfigDto[]
  draft: { level: number; title: string; xpThreshold: number; description: string; active: boolean }
  saving: boolean
  isEditing: boolean
  onDraftChange: (value: { level: number; title: string; xpThreshold: number; description: string; active: boolean }) => void
  onSave: () => void
  onEdit: (l: LevelConfigDto) => void
  onCancel: () => void
  onDelete: (l: LevelConfigDto) => void
}) => {
  const t = useTranslations('admin.engagement.levels')
  const tAdmin = useTranslations('admin')
  const fmt = useFormatters()
  return (
    <div>
      <div className="mb-4 border rounded-lg p-4 bg-gray-50">
        <div className="font-medium text-ocean-800 mb-3">{isEditing ? t('editLevel') : t('addLevel')}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('level')}</label>
            <input
              type="number"
              min={1}
              value={draft.level}
              onChange={(e) => onDraftChange({ ...draft, level: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('xpThreshold')}</label>
            <input
              type="number"
              min={0}
              value={draft.xpThreshold}
              onChange={(e) => onDraftChange({ ...draft, xpThreshold: Math.max(0, parseInt(e.target.value) || 0) })}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">{t('levelTitle')}</label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder={t('titlePlaceholder')}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">{t('description')}</label>
            <input
              type="text"
              value={draft.description}
              onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder={t('descPlaceholder')}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => onDraftChange({ ...draft, active: e.target.checked })}
            />
            {t('active')}
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm disabled:opacity-50"
          >
            {saving ? t('saving') : (isEditing ? t('saveChanges') : t('addLevel'))}
          </button>
          {isEditing && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-100"
            >
              {tAdmin('cancel')}
            </button>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-4">{t('levelsConfigured', { count: levels.length })}</div>
      <table className="w-full text-sm">
        <thead><tr className="border-b">
          <th className="text-left py-2 px-3 text-gray-500">{t('level')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('levelTitle')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('xpThreshold')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('status')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('actions')}</th>
        </tr></thead>
        <tbody>{levels.map((level) => (
          <tr key={level.id} className="border-b">
            <td className="py-2 px-3 font-bold">{level.level}</td>
            <td className="py-2 px-3">{level.title}</td>
            <td className="py-2 px-3 font-semibold">{fmt.formatCompact(level.xpThreshold)}</td>
            <td className="py-2 px-3">
              <span className={'px-2 py-0.5 rounded-full text-xs ' + (level.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500')}>
                {level.active ? t('active') : t('inactive')}
              </span>
            </td>
            <td className="py-2 px-3">
              <button onClick={() => onEdit(level)} className="text-xs text-ocean-700 hover:underline mr-3">{t('edit')}</button>
              <button onClick={() => onDelete(level)} className="text-xs text-red-600 hover:underline">{t('delete')}</button>
            </td>
          </tr>))}</tbody>
      </table>
    </div>
  )
})
LevelsTab.displayName = 'LevelsTab'
