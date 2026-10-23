'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { GamificationRuleDto, LevelConfigDto, RecalculationResultDto, RecalculationJobDto, RewardActionType } from '@crabwatch/shared'
import { EngagementAdminTabProps } from './engagement/types'
import { XPRulesTab } from './engagement/XPRulesTab'
import { LevelsTab } from './engagement/LevelsTab'
import { XPAdjustTab } from './engagement/XPAdjustTab'
import { AchievementsAdminSubTab } from './engagement/AchievementsAdminSubTab'
import { MissionsAdminSubTab } from './engagement/MissionsAdminSubTab'
import { SeasonsAdminSubTab } from './engagement/SeasonsAdminSubTab'
import { CampaignAdminSubTab } from './engagement/CampaignAdminSubTab'
import { AuditAdminSubTab } from './engagement/AuditAdminSubTab'
import { MetricsAdminSubTab } from './engagement/MetricsAdminSubTab'
import { AbuseAdminSubTab } from './engagement/AbuseAdminSubTab'

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
