'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { GamificationRuleDto } from '@crabwatch/shared'

export const XPRulesTab = memo(({
  rules,
  draft,
  saving,
  isEditing,
  onDraftChange,
  onSave,
  onEdit,
  onCancel,
  onToggle,
  onDelete,
}: {
  rules: GamificationRuleDto[]
  draft: { actionType: string; name: string; description: string; xpReward: number; active: boolean }
  saving: boolean
  isEditing: boolean
  onDraftChange: (value: { actionType: string; name: string; description: string; xpReward: number; active: boolean }) => void
  onSave: () => void
  onEdit: (r: GamificationRuleDto) => void
  onCancel: () => void
  onToggle: (r: GamificationRuleDto) => void
  onDelete: (r: GamificationRuleDto) => void
}) => {
  const t = useTranslations('admin.engagement.xpRules')
  const tAdmin = useTranslations('admin')
  return (
    <div>
      <div className="mb-4 border rounded-lg p-4 bg-gray-50">
        <div className="font-medium text-ocean-800 mb-3">{isEditing ? t('editRule') : t('addRule')}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('actionType')}</label>
            <input
              type="text"
              value={draft.actionType}
              onChange={(e) => onDraftChange({ ...draft, actionType: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder={t('actionTypePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('xpReward')}</label>
            <input
              type="number"
              value={draft.xpReward}
              onChange={(e) => onDraftChange({ ...draft, xpReward: parseInt(e.target.value) || 0 })}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">{t('name')}</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder={t('namePlaceholder')}
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
            {saving ? t('saving') : (isEditing ? t('saveChanges') : t('addRule'))}
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

      <div className="text-sm text-gray-500 mb-4">{t('rulesConfigured', { count: rules.length })}</div>
      <table className="w-full text-sm">
        <thead><tr className="border-b">
          <th className="text-left py-2 px-3 text-gray-500">{t('action')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('name')}</th>
          <th className="text-left py-2 px-3 text-gray-500">XP</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('active')}</th>
          <th className="text-left py-2 px-3 text-gray-500">{t('actions')}</th>
        </tr></thead>
        <tbody>{rules.map((rule) => (
          <tr key={rule.id} className="border-b">
            <td className="py-2 px-3 font-mono text-xs">{rule.actionType}</td>
            <td className="py-2 px-3">{rule.name}</td>
            <td className="py-2 px-3 font-semibold">{rule.xpReward}</td>
            <td className="py-2 px-3">
              <button onClick={() => onToggle(rule)}
                className={'px-2 py-0.5 rounded-full text-xs ' + (rule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500')}>
                {rule.active ? t('active') : t('inactive')}</button>
            </td>
            <td className="py-2 px-3">
              <button onClick={() => onEdit(rule)} className="text-xs text-ocean-700 hover:underline mr-3">{t('edit')}</button>
              <button onClick={() => onDelete(rule)} className="text-xs text-red-600 hover:underline">{t('delete')}</button>
            </td>
          </tr>))}</tbody>
      </table>
    </div>
  )
})
XPRulesTab.displayName = 'XPRulesTab'
