'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/useFormatters'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { GamificationRuleDto, LevelConfigDto, CampaignDto, AdminAuditLogDto, AbuseSignalDto, AchievementDto, MissionDto, SeasonDto, EngagementMetricsDto, RecalculationResultDto, RecalculationJobDto, RecalculationUserResult, AchievementCondition, RewardActionType } from '@crabwatch/shared'

interface EngagementAdminTabProps {
  flash: (msg: string, type: 'error' | 'success') => void
}

export function EngagementAdminTab({ flash }: EngagementAdminTabProps): React.JSX.Element {
  const t = useTranslations('admin.engagement')
  const tAdmin = useTranslations('admin')
  const [subTab, setSubTab] = useState<'xp-rules' | 'levels' | 'xp-adjust' | 'achievements' | 'missions' | 'seasons' | 'campaigns' | 'audit' | 'abuse' | 'metrics'>('xp-rules')
  const [rules, setRules] = useState<GamificationRuleDto[]>([])
  const [levels, setLevels] = useState<LevelConfigDto[]>([])
  const [loading, setLoading] = useState(true)
  const [ruleDraft, setRuleDraft] = useState({
    actionType: '',
    name: '',
    description: '',
    xpReward: 0,
    active: true,
  })
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [savingRule, setSavingRule] = useState(false)
  const [levelDraft, setLevelDraft] = useState({
    level: 1,
    title: '',
    xpThreshold: 0,
    description: '',
    active: true,
  })
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null)
  const [savingLevel, setSavingLevel] = useState(false)

  const [adjUserId, setAdjUserId] = useState('')
  const [adjDeltaXP, setAdjDeltaXP] = useState(0)
  const [adjReason, setAdjReason] = useState('')
  const [adjLoading, setAdjLoading] = useState(false)

  const [recalcMode, setRecalcMode] = useState<'dry-run' | 'execute'>('dry-run')
  const [recalcUserId, setRecalcUserId] = useState('')
  const [recalcReason, setRecalcReason] = useState('')
  const [recalcLoading, setRecalcLoading] = useState(false)
  const [recalcResults, setRecalcResults] = useState<RecalculationResultDto | null>(null)
  const [recalcJobId, setRecalcJobId] = useState<string | null>(null)
  const [recalcJobStatus, setRecalcJobStatus] = useState<{ status: string; processed?: number; updatedAt?: Date } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([loadRules(), loadLevels()])
    return () => controller.abort()
  }, [])

  const loadRules = async () => {
    try {
      const data = await api.listGamificationRules()
      setRules(Array.isArray(data) ? data : [])
    } catch (err) {
      logger.error('Failed to load rules', err)
    } finally {
      setLoading(false)
    }
  }

  const loadLevels = async () => {
    try {
      const data = await api.listLevelConfigs()
      setLevels(Array.isArray(data) ? data : [])
    } catch (err) {
      logger.error('Failed to load levels', err)
    }
  }

  const handleAdjustXP = async () => {
    if (!adjUserId || !adjReason) { flash(tAdmin('requiredFields'), 'error'); return }
    setAdjLoading(true)
    try {
      await api.adjustXP({ userId: adjUserId, deltaXP: adjDeltaXP, reason: adjReason })
      flash(t('xpAdjusted'), 'success')
      setAdjUserId(''); setAdjDeltaXP(0); setAdjReason('')
    } catch (err: unknown) { flash(err instanceof Error ? err.message : 'Failed', 'error') }
    finally { setAdjLoading(false) }
  }

  const handleRecalculate = async () => {
    setRecalcLoading(true)
    try {
      const data = await api.recalculateXP({ mode: recalcMode, userId: recalcUserId || undefined, reason: recalcReason || undefined }) as RecalculationResultDto
      setRecalcResults(data)
      if (data.jobId) {
        setRecalcJobId(data.jobId)
        setRecalcJobStatus({ status: 'running', updatedAt: new Date() })
        pollJobStatus(data.jobId)
      }
      flash(t('recalcDone'), 'success')
    } catch (err: unknown) { flash(err instanceof Error ? err.message : 'Failed', 'error') }
    finally { setRecalcLoading(false) }
  }

  const pollingRef = useRef(false)

  const pollJobStatus = async (jobId: string) => {
    pollingRef.current = true
    const poll = async () => {
      if (!pollingRef.current) return
      try {
    const status = await api.getRecalculationJobStatus(jobId) as RecalculationJobDto
        setRecalcJobStatus(status)
        if (status.status !== 'running') {
          flash(`Job ${status.status}: ${status.processedUsers || 0} users processed`, 'success')
          return
        }
        setTimeout(poll, 2000)
      } catch (err) {
        pollingRef.current = false
        // Job may have been cleared
        logger.warn('Recalculation poll ended', err)
      }
    }
    setTimeout(poll, 2000)
  }

  const checkJobStatus = async (jobId: string) => {
    try {
      const status = await api.getRecalculationJobStatus(jobId) as RecalculationJobDto
      setRecalcJobId(jobId)
      setRecalcJobStatus({ status: status.status, processed: status.processedUsers, updatedAt: new Date(status.createdAt) })
      if (status.status === 'running') pollJobStatus(jobId)
    } catch (err: unknown) { flash(err instanceof Error ? err.message : 'Job not found', 'error') }
  }

  const handleToggleRule = async (rule: GamificationRuleDto) => {
    try {
      await api.updateGamificationRule(rule.id, { active: !rule.active })
      flash(t('ruleToggled'), 'success')
      loadRules()
    } catch (err: unknown) { flash(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  const handleDeleteRule = async (rule: GamificationRuleDto) => {
    try { await api.deleteGamificationRule(rule.id); flash(t('ruleDeleted'), 'success'); loadRules() }
    catch (err: unknown) { flash(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  const resetRuleDraft = () => {
    setRuleDraft({ actionType: '', name: '', description: '', xpReward: 0, active: true })
    setEditingRuleId(null)
  }

  const handleEditRule = (rule: GamificationRuleDto) => {
    setEditingRuleId(rule.id)
    setRuleDraft({
      actionType: rule.actionType || '',
      name: rule.name || '',
      description: rule.description || '',
      xpReward: Number(rule.xpReward) || 0,
      active: rule.active !== false,
    })
  }

  const handleSaveRule = async () => {
    if (!ruleDraft.actionType.trim() || !ruleDraft.name.trim()) {
      flash(t('actionTypeNameRequired'), 'error')
      return
    }

    setSavingRule(true)
    try {
      const payload = {
        actionType: ruleDraft.actionType.trim() as RewardActionType,
        name: ruleDraft.name.trim(),
        description: ruleDraft.description.trim() || null,
        xpReward: ruleDraft.xpReward,
        active: ruleDraft.active,
      }

      if (editingRuleId) {
        await api.updateGamificationRule(editingRuleId, payload)
        flash(t('ruleUpdated'), 'success')
      } else {
        await api.createGamificationRule(payload)
        flash(t('ruleCreated'), 'success')
      }

      resetRuleDraft()
      await loadRules()
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSavingRule(false)
    }
  }

  const handleDeleteLevel = async (level: LevelConfigDto) => {
    try { await api.deleteLevelConfig(level.id); flash(t('levelDeleted'), 'success'); loadLevels() }
    catch (err: unknown) { flash(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  const resetLevelDraft = () => {
    setLevelDraft({ level: 1, title: '', xpThreshold: 0, description: '', active: true })
    setEditingLevelId(null)
  }

  const handleEditLevel = (level: LevelConfigDto) => {
    setEditingLevelId(level.id)
    setLevelDraft({
      level: Number(level.level) || 1,
      title: level.title || '',
      xpThreshold: Number(level.xpThreshold) || 0,
      description: level.description || '',
      active: level.active !== false,
    })
  }

  const handleSaveLevel = async () => {
    if (!levelDraft.title.trim()) {
      flash(t('levelTitleRequired'), 'error')
      return
    }
    if (levelDraft.level < 1) {
      flash(t('levelMinOne'), 'error')
      return
    }
    if (levelDraft.xpThreshold < 0) {
      flash(t('xpThresholdNonNegative'), 'error')
      return
    }

    setSavingLevel(true)
    try {
      const payload = {
        level: levelDraft.level,
        title: levelDraft.title.trim(),
        xpThreshold: levelDraft.xpThreshold,
        description: levelDraft.description.trim() || null,
        active: levelDraft.active,
      }

      if (editingLevelId) {
        await api.updateLevelConfig(editingLevelId, payload)
        flash(t('levelUpdated'), 'success')
      } else {
        await api.createLevelConfig(payload)
        flash(t('levelCreated'), 'success')
      }

      resetLevelDraft()
      await loadLevels()
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSavingLevel(false)
    }
  }

  const subTabs = [
    { key: 'xp-rules', label: t('xpRules.title') },
    { key: 'levels', label: t('levels.title') },
    { key: 'xp-adjust', label: t('adjustments.title') },
    { key: 'achievements', label: t('achievements.title') },
    { key: 'missions', label: t('missions.title') },
    { key: 'seasons', label: t('seasons.title') },
    { key: 'campaigns', label: t('campaigns.title') },
    { key: 'audit', label: t('auditLog.title') },
    { key: 'abuse', label: t('abuse.title') },
    { key: 'metrics', label: t('metrics.title') },
  ] as const

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-ocean-800 mb-4">{t('title')}</h2>
      <div className="flex gap-2 mb-6 border-b overflow-x-auto">
        {subTabs.map((sub) => (
          <button key={sub.key} onClick={() => setSubTab(sub.key)}
            className={'px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ' +
              (subTab === sub.key ? 'text-ocean-700 border-b-2 border-ocean-700' : 'text-gray-500 hover:text-gray-700')}>
            {sub.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse"><div className="h-4 w-40 bg-gray-200 rounded mb-4" /></div>
      ) : subTab === 'xp-rules' ? (
        <XPRulesTab
          rules={rules}
          draft={ruleDraft}
          saving={savingRule}
          isEditing={!!editingRuleId}
          onDraftChange={setRuleDraft}
          onSave={handleSaveRule}
          onEdit={handleEditRule}
          onCancel={resetRuleDraft}
          onToggle={handleToggleRule}
          onDelete={handleDeleteRule}
        />
      ) : subTab === 'levels' ? (
        <LevelsTab
          levels={levels}
          draft={levelDraft}
          saving={savingLevel}
          isEditing={!!editingLevelId}
          onDraftChange={setLevelDraft}
          onSave={handleSaveLevel}
          onEdit={handleEditLevel}
          onCancel={resetLevelDraft}
          onDelete={handleDeleteLevel}
        />
      ) : subTab === 'xp-adjust' ? (
        <XPAdjustTab adjUserId={adjUserId} setAdjUserId={setAdjUserId} adjDeltaXP={adjDeltaXP} setAdjDeltaXP={setAdjDeltaXP}
          adjReason={adjReason} setAdjReason={setAdjReason} adjLoading={adjLoading}
          recalcMode={recalcMode} setRecalcMode={setRecalcMode} recalcUserId={recalcUserId} setRecalcUserId={setRecalcUserId}
          recalcReason={recalcReason} setRecalcReason={setRecalcReason} recalcLoading={recalcLoading} recalcResults={recalcResults}
          recalcJobId={recalcJobId} recalcJobStatus={recalcJobStatus}
          onAdjust={handleAdjustXP} onRecalculate={handleRecalculate} onCheckJob={checkJobStatus} />
      ) : subTab === 'achievements' ? (
        <AchievementsAdminSubTab flash={flash} />
      ) : subTab === 'missions' ? (
        <MissionsAdminSubTab flash={flash} />
      ) : subTab === 'seasons' ? (
        <SeasonsAdminSubTab flash={flash} />
      ) : subTab === 'campaigns' ? (
        <CampaignAdminSubTab flash={flash} />
      ) : subTab === 'audit' ? (
        <AuditAdminSubTab flash={flash} />
      ) : subTab === 'metrics' ? (
        <MetricsAdminSubTab flash={flash} />
      ) : (
        <AbuseAdminSubTab flash={flash} />
      )}
    </div>
  )
}

const XPRulesTab = memo(({
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

const LevelsTab = memo(({
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

const XPAdjustTab = memo((props: {
  adjUserId: string; setAdjUserId: (v: string) => void; adjDeltaXP: number; setAdjDeltaXP: (v: number) => void;
  adjReason: string; setAdjReason: (v: string) => void; adjLoading: boolean;
  recalcMode: 'dry-run' | 'execute'; setRecalcMode: (v: 'dry-run' | 'execute') => void;
  recalcUserId: string; setRecalcUserId: (v: string) => void; recalcReason: string; setRecalcReason: (v: string) => void;
  recalcLoading: boolean; recalcResults: RecalculationResultDto | null;
  recalcJobId: string | null; recalcJobStatus: { status: string; processed?: number; updatedAt?: Date } | null;
  onAdjust: () => void; onRecalculate: () => void; onCheckJob: (jobId: string) => void;
}) => {
  const tAdj = useTranslations('admin.engagement.adjustments')
  const tRecalc = useTranslations('admin.engagement.recalculation')
  const tAdmin = useTranslations('admin')
  const { adjUserId, setAdjUserId, adjDeltaXP, setAdjDeltaXP, adjReason, setAdjReason, adjLoading,
    recalcMode, setRecalcMode, recalcUserId, setRecalcUserId, recalcReason, setRecalcReason,
    recalcLoading, recalcResults, recalcJobId, recalcJobStatus, onAdjust, onRecalculate, onCheckJob } = props
  const [checkJobInput, setCheckJobInput] = useState('')
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-ocean-800 mb-4">{tAdj('title')}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{tAdj('userId')}</label>
            <input type="text" value={adjUserId} onChange={(e) => setAdjUserId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder={tAdj('selectUser')} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{tAdj('amount')}</label>
            <input type="number" value={adjDeltaXP} onChange={(e) => setAdjDeltaXP(parseInt(e.target.value) || 0)}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{tAdj('reason')}</label>
            <input type="text" value={adjReason} onChange={(e) => setAdjReason(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder={tAdj('reasonPlaceholder')} />
          </div>
          <button onClick={onAdjust} disabled={adjLoading}
            className="w-full bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm disabled:opacity-50">
            {adjLoading ? tAdj('adjusting') : tAdj('adjust')}
          </button>
        </div>
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-ocean-800 mb-4">{tRecalc('title')}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{tRecalc('mode')}</label>
            <select value={recalcMode} onChange={(e) => setRecalcMode(e.target.value as 'dry-run' | 'execute')}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="dry-run">{tRecalc('dryRun')}</option>
              <option value="execute">{tRecalc('execute')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{tRecalc('userIdOptional')}</label>
            <input type="text" value={recalcUserId} onChange={(e) => setRecalcUserId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder={tRecalc('allUsersPlaceholder')} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{tRecalc('reason')}</label>
            <input type="text" value={recalcReason} onChange={(e) => setRecalcReason(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder={tRecalc('reasonPlaceholder')} />
          </div>
          <button onClick={onRecalculate} disabled={recalcLoading}
            className="w-full bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm disabled:opacity-50">
            {recalcLoading ? tRecalc('running') : tRecalc('recalculate')}
          </button>
        </div>
{recalcResults && (
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
              <div className="font-medium mb-2">{tRecalc('results')}:</div>
              <div className="text-gray-600">{tRecalc('mode')}: {recalcResults.mode} | {tRecalc('users')}: {recalcResults.totalUsers}</div>
              {recalcResults.results?.slice(0, 5).map((r: RecalculationUserResult) => {
                const diffStr = r.diff >= 0 ? '+' + r.diff : String(r.diff)
                const arrow = ' \u2192 '
                return (
                  <div key={r.userId} className="text-xs text-gray-500 mt-1">
                    {r.userId}: {r.currentXP}{arrow}{r.correctXP} ({tRecalc('diff')}: {diffStr})
                  </div>
                )
              })}
            </div>
          )}

          {/* Job Status Monitor */}
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <div className="font-medium mb-2">{tRecalc('jobStatus')}</div>
            <div className="flex gap-2 mb-3">
              <input type="text" value={checkJobInput} onChange={(e) => setCheckJobInput(e.target.value)}
                className="flex-1 border rounded px-2 py-1 text-xs" placeholder={tRecalc('enterJobId')} />
              <button onClick={() => checkJobInput && onCheckJob(checkJobInput)}
                className="text-xs bg-ocean-600 text-white px-3 py-1 rounded">{tRecalc('check')}</button>
            </div>
            {recalcJobStatus && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${recalcJobStatus.status === 'running' ? 'bg-blue-500 animate-pulse' : recalcJobStatus.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs font-medium capitalize">{recalcJobStatus.status === 'running' ? tRecalc('statusRunning') : recalcJobStatus.status === 'completed' ? tRecalc('statusCompleted') : tRecalc('statusFailed')}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {tRecalc('usersProcessed', { processed: recalcJobStatus.processed ?? 0 })}
                  </span>
                </div>
                {recalcJobId && (
                  <div className="text-xs text-gray-400 font-mono truncate">ID: {recalcJobId}</div>
                )}
               <div className="text-xs text-gray-400">
                    {tRecalc('updated')}: {recalcJobStatus.updatedAt ? new Date(recalcJobStatus.updatedAt).toLocaleTimeString() : '\u2014'}
                  </div>
              </div>
            )}
          </div>
      </div>
    </div>
  )
})
XPAdjustTab.displayName = 'XPAdjustTab'

const CampaignAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
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

const AuditAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
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

const AbuseAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
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

// ==================== ACHIEVEMENTS ADMIN ====================

const AchievementsAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
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

// ==================== MISSIONS ADMIN ====================

const MissionsAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
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

// ==================== SEASONS ADMIN ====================

const MetricsAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
  const tMetrics = useTranslations('admin.engagement.metrics')
  const tAdmin = useTranslations('admin')
  const fmt = useFormatters()
  const [metrics, setMetrics] = useState<EngagementMetricsDto | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const data = await api.getEngagementMetrics()
      setMetrics(data as EngagementMetricsDto)
    } catch { logger.error('Failed to load metrics') }
    finally { setLoading(false) }
  }
  useEffect(() => { loadMetrics() }, [])

  if (loading) return <div className="animate-pulse"><div className="h-4 w-40 bg-gray-200 rounded" /></div>
  if (!metrics) return <p className="text-gray-400 py-8 text-center">{tMetrics('noMetrics')}</p>

  const m = metrics

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-ocean-800">{tMetrics('healthTitle')}</h3>
        <button onClick={loadMetrics} className="text-sm text-ocean-600 hover:underline">{tMetrics('refresh')}</button>
      </div>

      {/* User Engagement */}
      <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('userEngagement')}</h4>
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-ocean-800">{m.totalUsers}</div>
          <div className="text-xs text-gray-500">{tMetrics('totalUsers')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{m.dau}</div>
          <div className="text-xs text-gray-500">{tMetrics('dau')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{m.wau}</div>
          <div className="text-xs text-gray-500">{tMetrics('wau')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-indigo-600">{m.mau}</div>
          <div className="text-xs text-gray-500">{tMetrics('mau')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${m.stickiness >= 20 ? 'text-green-600' : m.stickiness >= 10 ? 'text-amber-600' : 'text-red-600'}`}>{m.stickiness}%</div>
          <div className="text-xs text-gray-500">{tMetrics('stickiness')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{m.newUsers7d}</div>
          <div className="text-xs text-gray-500">{tMetrics('new7d')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-teal-600">{m.newUsers30d}</div>
          <div className="text-xs text-gray-500">{tMetrics('new30d')}</div>
        </div>
      </div>

      {/* Observation Metrics */}
      <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('observations')}</h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-ocean-800">{m.totalObservations}</div>
          <div className="text-xs text-gray-500">{tMetrics('total')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{m.observations7d}</div>
          <div className="text-xs text-gray-500">{tMetrics('last7d')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{m.observations30d}</div>
          <div className="text-xs text-gray-500">{tMetrics('last30d')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{m.pendingApproval}</div>
          <div className="text-xs text-gray-500">{tMetrics('pending')}</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-ocean-600">{m.approvalRate}%</div>
          <div className="text-xs text-gray-500">{tMetrics('approvalRate')}</div>
        </div>
      </div>

      {/* XP & Streak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('xpDistribution')}</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-ocean-800">{fmt.formatCompact(Math.round(m.avgXP))}</div>
              <div className="text-xs text-gray-500">{tMetrics('avgXP')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{fmt.formatCompact(Math.round(m.medianXP))}</div>
              <div className="text-xs text-gray-500">{tMetrics('medianXP')}</div>
            </div>
          </div>
          {m.xpDistribution?.length > 0 && (
            <table className="w-full text-xs">
              <thead><tr className="border-b">
                <th className="text-left py-1 px-2 text-gray-500">{tMetrics('level')}</th>
                <th className="text-left py-1 px-2 text-gray-500">{tMetrics('title')}</th>
                <th className="text-right py-1 px-2 text-gray-500">{tMetrics('users')}</th>
              </tr></thead>
              <tbody>{m.xpDistribution.map((d: { level: number; title: string; count: number }) => (
                <tr key={d.level} className="border-b">
                  <td className="py-1 px-2 font-bold">{d.level}</td>
                  <td className="py-1 px-2">{d.title}</td>
                  <td className="py-1 px-2 text-right">{d.count}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('streakMetrics')}</h4>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{fmt.formatNumber(m.avgStreak, 1)}</div>
              <div className="text-xs text-gray-500">{tMetrics('avgStreak')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{m.maxStreak}</div>
              <div className="text-xs text-gray-500">{tMetrics('maxStreak')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{m.usersWithStreak}</div>
              <div className="text-xs text-gray-500">{tMetrics('activeStreaks')}</div>
            </div>
          </div>
          {m.streakDistribution?.length > 0 && (
            <table className="w-full text-xs">
              <thead><tr className="border-b">
                <th className="text-left py-1 px-2 text-gray-500">{tMetrics('range')}</th>
                <th className="text-right py-1 px-2 text-gray-500">{tMetrics('users')}</th>
              </tr></thead>
              <tbody>{m.streakDistribution.map((d: { bucket: string; count: number }, i: number) => (
                <tr key={i} className="border-b">
                  <td className="py-1 px-2">{d.bucket}</td>
                  <td className="py-1 px-2 text-right">{d.count}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
     </div>

     {/* Missions & Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('missions')}</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{m.missionsCompleted7d}</div>
              <div className="text-xs text-gray-500">{tMetrics('completed7d')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{m.missionsCompleted30d}</div>
              <div className="text-xs text-gray-500">{tMetrics('completed30d')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-ocean-600">{m.missionCompletionRate}%</div>
              <div className="text-xs text-gray-500">{tMetrics('completionRate')}</div>
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('achievements')}</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-ocean-800">{m.totalAchievements}</div>
              <div className="text-xs text-gray-500">{tMetrics('available')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{m.totalUnlocks}</div>
              <div className="text-xs text-gray-500">{tMetrics('totalUnlocks')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{m.avgAchievementsPerUser}</div>
              <div className="text-xs text-gray-500">{tMetrics('perUser')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Abuse & System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('abuseDetection')}</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{m.activeAbuseSignals}</div>
              <div className="text-xs text-gray-500">{tMetrics('openSignals')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{m.resolvedSignals7d}</div>
              <div className="text-xs text-gray-500">{tMetrics('resolved7d')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{m.highRiskUsers}</div>
              <div className="text-xs text-gray-500">{tMetrics('highRiskUsers')}</div>
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{tMetrics('systemHealth')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-ocean-800">{m.xpTransactions7d}</div>
              <div className="text-xs text-gray-500">{tMetrics('xpTransactions7d')}</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{m.auditLogs7d}</div>
              <div className="text-xs text-gray-500">{tMetrics('auditLogs7d')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
MetricsAdminSubTab.displayName = 'MetricsAdminSubTab'

const SeasonsAdminSubTab = memo(({ flash }: EngagementAdminTabProps): React.JSX.Element => {
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
