import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput as RNTextInput,
  RefreshControl,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useIsFocused } from '@react-navigation/native'
import { api } from '../../../services/api'
import { Button } from '../../../components/common/Button'
import { COLORS } from '../../../utils/constants'
import { useFormatters } from '../../../hooks/useFormatters'
import type {
  GamificationRuleDto,
  LevelConfigDto,
  CampaignDto,
  AdminAuditLogDto,
  AbuseSignalDto,
  EngagementMetricsDto,
  RewardActionType,
} from '@crabwatch/shared'
import { styles } from './styles'

type EngagementSubTab = 'xp-rules' | 'levels' | 'xp-adjust' | 'campaigns' | 'audit' | 'abuse' | 'metrics'

type AuditStats = {
  total: number
  byAction: Record<string, number>
  byResourceType: Record<string, number>
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function normalizeAuditStats(raw: unknown): AuditStats | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const value = raw as Record<string, unknown>
  const byAction = value.byAction && typeof value.byAction === 'object'
    ? { ...(value.byAction as Record<string, number>) }
    : {}

  if (Array.isArray(value.topActions)) {
    for (const item of value.topActions as Array<Record<string, unknown>>) {
      const action = typeof item.action === 'string' ? item.action : ''
      if (!action) continue
      byAction[action] = toNumber(item.count)
    }
  }

  const byResourceType = value.byResourceType && typeof value.byResourceType === 'object'
    ? { ...(value.byResourceType as Record<string, number>) }
    : {}

  return {
    total: toNumber(value.total ?? value.totalLogs),
    byAction,
    byResourceType,
  }
}

interface EngagementTabProps {
  flash: (msg: string, type: 'error' | 'success') => void
}

export function EngagementTab({ flash }: EngagementTabProps) {
  const { t } = useTranslation('admin')
  const { formatDate, formatDateTime } = useFormatters()
  const isFocused = useIsFocused()

  const [engagementSubTab, setEngagementSubTab] = useState<EngagementSubTab>('xp-rules')
  const [rules, setRules] = useState<GamificationRuleDto[]>([])
  const [levels, setLevels] = useState<LevelConfigDto[]>([])
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogDto[]>([])
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null)
  const [abuseSignals, setAbuseSignals] = useState<AbuseSignalDto[]>([])
  const [metrics, setMetrics] = useState<EngagementMetricsDto | null>(null)
  const [ruleDraft, setRuleDraft] = useState({ actionType: '', name: '', description: '', xpReward: 0, active: true })
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [levelDraft, setLevelDraft] = useState({ level: 1, xpThreshold: 0, title: '', description: '', active: true })
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null)
  const [adjUserId, setAdjUserId] = useState('')
  const [adjDeltaXP, setAdjDeltaXP] = useState(0)
  const [adjReason, setAdjReason] = useState('')
  const [recalcMode, setRecalcMode] = useState<'dry-run' | 'execute'>('dry-run')
  const [recalcUserId, setRecalcUserId] = useState('')
  const [recalcReason, setRecalcReason] = useState('')
  const [recalcResults, setRecalcResults] = useState<any | null>(null)
  const [recalcJobIdInput, setRecalcJobIdInput] = useState('')
  const [recalcJobStatus, setRecalcJobStatus] = useState<any | null>(null)
  const [campaignDraft, setCampaignDraft] = useState({
    code: '',
    name: '',
    channel: 'PUSH',
    title: '',
    body: '',
    minLevel: 1,
  })
  const [campaignTestUserId, setCampaignTestUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [rulesData, levelsData, metricsData, campaignsData, logsData, statsData, abuseData] = await Promise.all([
        api.listGamificationRules(),
        api.listLevelConfigs(),
        api.getEngagementMetrics().catch(() => null),
        api.listCampaigns().catch(() => []),
        api.getAuditLogs({ limit: 20 }).catch(() => []),
        api.getAuditLogStats().catch(() => null),
        api.getAbuseSignals().catch(() => []),
      ])
      setRules(rulesData)
      setLevels(levelsData)
      setMetrics(metricsData)
      const normalizedLogs = Array.isArray(logsData) ? logsData : []
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : [])
      setAuditLogs(normalizedLogs)
      setAuditStats(normalizeAuditStats(statsData))
      setAbuseSignals(Array.isArray(abuseData) ? abuseData : [])
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to load data', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [flash])

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [loadData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [loadData])

  useEffect(() => {
    if (isFocused) {
      loadData()
    }
  }, [isFocused, loadData])

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
      flash(t('flash.actionNameRequired'), 'error')
      return
    }

    setActionLoading(true)
    try {
      const createPayload = {
        actionType: ruleDraft.actionType.trim() as RewardActionType,
        name: ruleDraft.name.trim(),
        description: ruleDraft.description.trim() || null,
        xpReward: ruleDraft.xpReward,
        active: ruleDraft.active,
      }

      if (editingRuleId) {
        await api.updateGamificationRule(editingRuleId, createPayload)
        flash(t('flash.xpRuleUpdated'), 'success')
      } else {
        await api.createGamificationRule(createPayload)
        flash(t('flash.xpRuleCreated'), 'success')
      }

      resetRuleDraft()
      loadData()
    } catch (err) {
      flash(err instanceof Error ? err.message : t('flash.xpRuleSaveFailed'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteRule = (rule: GamificationRuleDto) => {
    Alert.alert(t('alerts.deleteXpRule.title'), t('alerts.deleteXpRule.message', { name: rule.name }), [
      { text: t('cancel', { ns: 'common' }), style: 'cancel' },
      {
        text: t('delete', { ns: 'common' }),
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true)
          try {
            await api.deleteGamificationRule(rule.id)
            flash(t('flash.xpRuleDeleted'), 'success')
            loadData()
          } catch (err) {
            flash(err instanceof Error ? err.message : t('flash.xpRuleDeleteFailed'), 'error')
          } finally {
            setActionLoading(false)
          }
        },
      },
    ])
  }

  const handleToggleRule = async (rule: GamificationRuleDto) => {
    setActionLoading(true)
    try {
      await api.updateGamificationRule(rule.id, { active: !rule.active })
      flash(rule.active ? t('flash.ruleDisabled') : t('flash.ruleEnabled'), 'success')
      loadData()
    } catch (err) {
      flash(err instanceof Error ? err.message : t('flash.ruleUpdateFailed'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const resetLevelDraft = () => {
    setLevelDraft({ level: 1, xpThreshold: 0, title: '', description: '', active: true })
    setEditingLevelId(null)
  }

  const handleEditLevel = (level: LevelConfigDto) => {
    setEditingLevelId(level.id)
    setLevelDraft({
      level: Number(level.level) || 1,
      xpThreshold: Number(level.xpThreshold) || 0,
      title: level.title || '',
      description: level.description || '',
      active: level.active !== false,
    })
  }

  const handleSaveLevel = async () => {
    if (!levelDraft.title.trim()) {
      flash(t('flash.levelTitleRequired'), 'error')
      return
    }

    setActionLoading(true)
    try {
      const payload = {
        level: levelDraft.level,
        xpThreshold: levelDraft.xpThreshold,
        title: levelDraft.title.trim(),
        description: levelDraft.description.trim() || null,
        active: levelDraft.active,
      }

      if (editingLevelId) {
        await api.updateLevelConfig(editingLevelId, payload)
        flash(t('flash.levelUpdated'), 'success')
      } else {
        await api.createLevelConfig(payload)
        flash(t('flash.levelCreated'), 'success')
      }

      resetLevelDraft()
      loadData()
    } catch (err) {
      flash(err instanceof Error ? err.message : t('flash.levelSaveFailed'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteLevel = (level: LevelConfigDto) => {
    Alert.alert(t('alerts.deleteLevel.title'), t('alerts.deleteLevel.message', { level: level.level, title: level.title }), [
      { text: t('cancel', { ns: 'common' }), style: 'cancel' },
      {
        text: t('delete', { ns: 'common' }),
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true)
          try {
            await api.deleteLevelConfig(level.id)
            flash(t('flash.levelDeleted'), 'success')
            loadData()
          } catch (err) {
            flash(err instanceof Error ? err.message : t('flash.levelDeleteFailed'), 'error')
          } finally {
            setActionLoading(false)
          }
        },
      },
    ])
  }

  const handleAdjustXP = async () => {
    if (!adjUserId.trim() || !adjReason.trim() || adjDeltaXP === 0) {
      flash(t('flash.xpAdjustRequired'), 'error')
      return
    }
    setActionLoading(true)
    try {
      await api.adjustXP({ userId: adjUserId.trim(), deltaXP: adjDeltaXP, reason: adjReason.trim() })
      flash(t('flash.xpAdjusted'), 'success')
      setAdjReason('')
      setAdjDeltaXP(0)
      loadData()
    } catch (err) {
      flash(err instanceof Error ? err.message : t('flash.xpAdjustFailed'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRecalculate = async () => {
    setActionLoading(true)
    try {
      const result = await api.recalculateXP({
        mode: recalcMode,
        userId: recalcUserId.trim() || undefined,
        reason: recalcReason.trim() || undefined,
      })
      setRecalcResults(result)
      if (result?.id) {
        setRecalcJobStatus(result)
        setRecalcJobIdInput(result.id)
      }
      flash(t('flash.recalculationCompleted'), 'success')
      loadData()
    } catch (err) {
      flash(err instanceof Error ? err.message : t('flash.recalculationFailed'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckRecalcJob = async () => {
    if (!recalcJobIdInput.trim()) {
      flash(t('flash.enterJobId'), 'error')
      return
    }
    setActionLoading(true)
    try {
      const status = await api.getRecalculationJobStatus(recalcJobIdInput.trim())
      setRecalcJobStatus(status)
      flash(t('flash.jobStatusUpdated'), 'success')
    } catch (err) {
      flash(err instanceof Error ? err.message : t('flash.jobStatusFailed'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!campaignDraft.code.trim() || !campaignDraft.name.trim() || !campaignDraft.title.trim() || !campaignDraft.body.trim()) {
      flash(t('flash.campaignFieldsRequired'), 'error')
      return
    }
    setActionLoading(true)
    try {
      await api.createCampaign({
        code: campaignDraft.code.trim(),
        name: campaignDraft.name.trim(),
        channel: campaignDraft.channel,
        audienceFilter: { minLevel: campaignDraft.minLevel },
        content: { title: campaignDraft.title.trim(), body: campaignDraft.body.trim() },
      })
      flash(t('flash.campaignCreated'), 'success')
      setCampaignDraft({ code: '', name: '', channel: 'PUSH', title: '', body: '', minLevel: 1 })
      loadData()
    } catch (err) {
      flash(err instanceof Error ? err.message : t('flash.campaignCreateFailed'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLaunchCampaign = (campaign: CampaignDto) => {
    Alert.alert(t('alerts.launchCampaign.title'), t('alerts.launchCampaign.message', { name: campaign.name }), [
      { text: t('cancel', { ns: 'common' }), style: 'cancel' },
      {
        text: t('alerts.launchCampaign.confirm'),
        onPress: async () => {
          setActionLoading(true)
          try {
            await api.launchCampaign(campaign.id)
            flash(t('flash.campaignLaunched'), 'success')
            loadData()
          } catch (err) {
            flash(err instanceof Error ? err.message : t('flash.campaignLaunchFailed'), 'error')
          } finally {
            setActionLoading(false)
          }
        },
      },
    ])
  }

  const handleSendTestCampaign = async (campaignId: string) => {
    if (!campaignTestUserId.trim()) {
      flash(t('flash.testUserIdRequired'), 'error')
      return
    }
    setActionLoading(true)
    try {
      await api.sendTestCampaign(campaignId, campaignTestUserId.trim())
      flash(t('flash.testCampaignSent'), 'success')
      setCampaignTestUserId('')
    } catch (err) {
      flash(err instanceof Error ? err.message : t('flash.testCampaignFailed'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteCampaign = (campaign: CampaignDto) => {
    Alert.alert(t('alerts.deleteCampaign.title'), t('alerts.deleteCampaign.message', { name: campaign.name }), [
      { text: t('cancel', { ns: 'common' }), style: 'cancel' },
      {
        text: t('delete', { ns: 'common' }),
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true)
          try {
            await api.deleteCampaign(campaign.id)
            flash(t('flash.campaignDeleted'), 'success')
            loadData()
          } catch (err) {
            flash(err instanceof Error ? err.message : t('flash.campaignDeleteFailed'), 'error')
          } finally {
            setActionLoading(false)
          }
        },
      },
    ])
  }

  const handleResolveAbuseSignal = async (signal: AbuseSignalDto) => {
    setActionLoading(true)
    try {
      await api.resolveAbuseSignal(signal.id, 'Resolved via mobile admin panel')
      flash(t('flash.abuseResolved'), 'success')
      loadData()
    } catch (err) {
      flash(err instanceof Error ? err.message : t('flash.abuseResolveFailed'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const renderRules = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.formCardInScroll}>
        <Text style={styles.formTitle}>{editingRuleId ? t('rules.editTitle') : t('rules.addTitle')}</Text>
        <RNTextInput
          style={styles.input}
          placeholder={t('rules.actionTypePlaceholder')}
          value={ruleDraft.actionType}
          onChangeText={(v) => setRuleDraft((prev) => ({ ...prev, actionType: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder={t('rules.namePlaceholder')}
          value={ruleDraft.name}
          onChangeText={(v) => setRuleDraft((prev) => ({ ...prev, name: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder={t('rules.descriptionPlaceholder')}
          value={ruleDraft.description}
          onChangeText={(v) => setRuleDraft((prev) => ({ ...prev, description: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder={t('rules.xpRewardPlaceholder')}
          keyboardType="numeric"
          value={String(ruleDraft.xpReward)}
          onChangeText={(v) => setRuleDraft((prev) => ({ ...prev, xpReward: parseInt(v, 10) || 0 }))}
          placeholderTextColor={COLORS.textLight}
        />
        <View style={styles.inlineActions}>
          <Button title={editingRuleId ? t('rules.save') : t('rules.add')} onPress={handleSaveRule} loading={actionLoading} />
          {editingRuleId ? (
         <Button title={t('cancel', { ns: 'common' })} onPress={resetRuleDraft}
variant="secondary" />
          ) : null}
        </View>
      </View>

      {rules.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.actionType} • {item.xpReward} XP</Text>
            </View>
            <View style={[styles.statusBadge, item.active ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={styles.statusText}>{item.active ? t('rules.status.active').toUpperCase() : t('rules.status.inactive').toUpperCase()}</Text>
            </View>
          </View>
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          <View style={styles.cardActions}>
            <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleEditRule(item)}>
              <Text style={styles.actionBtnText}>{t('edit', { ns: 'common' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.roleChangeBtn]} onPress={() => handleToggleRule(item)}>
              <Text style={styles.actionBtnText}>{item.active ? t('rules.action.disable') : t('rules.action.enable')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDeleteRule(item)}>
              <Text style={styles.actionBtnText}>{t('delete', { ns: 'common' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  )

  const renderLevels = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.formCardInScroll}>
        <Text style={styles.formTitle}>{editingLevelId ? t('levels.editTitle') : t('levels.addTitle')}</Text>
        <RNTextInput
          style={styles.input}
          placeholder={t('levels.levelPlaceholder')}
          keyboardType="numeric"
          value={String(levelDraft.level)}
          onChangeText={(v) => setLevelDraft((prev) => ({ ...prev, level: parseInt(v, 10) || 1 }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder={t('levels.xpThresholdPlaceholder')}
          keyboardType="numeric"
          value={String(levelDraft.xpThreshold)}
          onChangeText={(v) => setLevelDraft((prev) => ({ ...prev, xpThreshold: parseInt(v, 10) || 0 }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder={t('levels.titlePlaceholder')}
          value={levelDraft.title}
          onChangeText={(v) => setLevelDraft((prev) => ({ ...prev, title: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder={t('levels.descriptionPlaceholder')}
          value={levelDraft.description}
          onChangeText={(v) => setLevelDraft((prev) => ({ ...prev, description: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <View style={styles.inlineActions}>
          <Button title={editingLevelId ? t('levels.save') : t('levels.add')} onPress={handleSaveLevel} loading={actionLoading} />
          {editingLevelId ? (
         <Button title={t('cancel', { ns: 'common' })} onPress={resetLevelDraft}
variant="secondary" />
          ) : null}
        </View>
      </View>

      {levels.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.userName}>Level {item.level} - {item.title}</Text>
              <Text style={styles.userEmail}>{item.xpThreshold} {t('levels.thresholdSuffix')}</Text>
            </View>
            <View style={[styles.statusBadge, item.active ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={styles.statusText}>{item.active ? t('levels.status.active').toUpperCase() : t('levels.status.inactive').toUpperCase()}</Text>
            </View>
          </View>
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          <View style={styles.cardActions}>
            <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleEditLevel(item)}>
              <Text style={styles.actionBtnText}>{t('edit', { ns: 'common' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDeleteLevel(item)}>
              <Text style={styles.actionBtnText}>{t('delete', { ns: 'common' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  )

  const renderMetrics = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {!metrics ? (
        <Text style={styles.userEmail}>{t('metrics.unavailable')}</Text>
      ) : (
        <View style={styles.card}>
          <Text style={styles.formTitle}>{t('metrics.title')}</Text>
          <Text style={styles.description}>{t('metrics.dailyActive')}: {metrics.activeUsers1d ?? t('metrics.na')}</Text>
          <Text style={styles.description}>{t('metrics.weeklyActive')}: {metrics.activeUsers7d ?? t('metrics.na')}</Text>
          <Text style={styles.description}>{t('metrics.monthlyActive')}: {metrics.activeUsers30d ?? t('metrics.na')}</Text>
          <Text style={styles.description}>{t('metrics.avgXP')}: {metrics.avgXP ?? t('metrics.na')}</Text>
          <Text style={styles.description}>{t('metrics.streakUsers')}: {metrics.usersWithStreak ?? t('metrics.na')}</Text>
        </View>
      )}
    </ScrollView>
  )

  const renderXPAdjust = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.formCardInScroll}>
        <Text style={styles.formTitle}>{t('xpAdjust.title')}</Text>
        <RNTextInput
          style={styles.input}
          placeholder={t('xpAdjust.userIdPlaceholder')}
          value={adjUserId}
          onChangeText={setAdjUserId}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder={t('xpAdjust.deltaXpPlaceholder')}
          keyboardType="numeric"
          value={String(adjDeltaXP)}
          onChangeText={(v) => setAdjDeltaXP(parseInt(v, 10) || 0)}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder={t('xpAdjust.reasonPlaceholder')}
          value={adjReason}
          onChangeText={setAdjReason}
          placeholderTextColor={COLORS.textLight}
        />
        <Button title={t('xpAdjust.adjust')} onPress={handleAdjustXP} loading={actionLoading} />
      </View>

      <View style={styles.formCardInScroll}>
        <Text style={styles.formTitle}>{t('xpAdjust.recalcTitle')}</Text>
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleOption, recalcMode === 'dry-run' && styles.roleOptionActive]}
            onPress={() => setRecalcMode('dry-run')}
          >
            <Text style={[styles.roleOptionText, recalcMode === 'dry-run' && styles.roleOptionTextActive]}>{t('xpAdjust.recalcModeDry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, recalcMode === 'execute' && styles.roleOptionActive]}
            onPress={() => setRecalcMode('execute')}
          >
            <Text style={[styles.roleOptionText, recalcMode === 'execute' && styles.roleOptionTextActive]}>{t('xpAdjust.recalcModeExecute')}</Text>
          </TouchableOpacity>
        </View>
        <RNTextInput
          style={styles.input}
          placeholder={t('xpAdjust.recalcUserIdPlaceholder')}
          value={recalcUserId}
          onChangeText={setRecalcUserId}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder={t('xpAdjust.recalcReasonPlaceholder')}
          value={recalcReason}
          onChangeText={setRecalcReason}
          placeholderTextColor={COLORS.textLight}
        />
        <Button title={t('xpAdjust.recalcRun')} onPress={handleRecalculate} loading={actionLoading} />

        {recalcResults ? (
          <View style={styles.mutedBox}>
            <Text style={styles.userEmail}>{t('xpAdjust.recalcResultMode')}: {String(recalcResults.mode ?? t('metrics.na'))}</Text>
            <Text style={styles.userEmail}>{t('xpAdjust.recalcResultUsers')}: {String(recalcResults.totalUsers ?? t('metrics.na'))}</Text>
          </View>
        ) : null}

        <RNTextInput
          style={styles.input}
          placeholder={t('xpAdjust.jobIdPlaceholder')}
          value={recalcJobIdInput}
          onChangeText={setRecalcJobIdInput}
          placeholderTextColor={COLORS.textLight}
        />
        <Button title={t('xpAdjust.checkJob')} onPress={handleCheckRecalcJob} loading={actionLoading} variant="secondary" />

        {recalcJobStatus ? (
          <View style={styles.mutedBox}>
            <Text style={styles.userEmail}>{t('xpAdjust.jobStatus')}: {String(recalcJobStatus.status ?? t('xpAdjust.unknown'))}</Text>
            <Text style={styles.userEmail}>{t('xpAdjust.jobProcessed')}: {String(recalcJobStatus.processed ?? 0)}</Text>
            <Text style={styles.userEmail}>{t('xpAdjust.jobUpdated')}: {recalcJobStatus.updatedAt ? formatDate(recalcJobStatus.updatedAt) : t('metrics.na')}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  )

  const renderCampaigns = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.formCardInScroll}>
        <Text style={styles.formTitle}>{t('campaigns.createTitle')}</Text>
        <RNTextInput
          style={styles.input}
          placeholder={t('campaigns.codePlaceholder')}
          value={campaignDraft.code}
          onChangeText={(v) => setCampaignDraft((prev) => ({ ...prev, code: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder={t('campaigns.namePlaceholder')}
          value={campaignDraft.name}
          onChangeText={(v) => setCampaignDraft((prev) => ({ ...prev, name: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <View style={styles.roleSelector}>
          {['PUSH', 'EMAIL', 'IN_APP'].map((channel) => (
            <TouchableOpacity
              key={channel}
              style={[styles.roleOption, campaignDraft.channel === channel && styles.roleOptionActive]}
              onPress={() => setCampaignDraft((prev) => ({ ...prev, channel }))}
            >
              <Text style={[styles.roleOptionText, campaignDraft.channel === channel && styles.roleOptionTextActive]}>{channel}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <RNTextInput
          style={styles.input}
          placeholder={t('campaigns.titlePlaceholder')}
          value={campaignDraft.title}
          onChangeText={(v) => setCampaignDraft((prev) => ({ ...prev, title: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder={t('campaigns.bodyPlaceholder')}
          value={campaignDraft.body}
          onChangeText={(v) => setCampaignDraft((prev) => ({ ...prev, body: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder={t('campaigns.minLevelPlaceholder')}
          keyboardType="numeric"
          value={String(campaignDraft.minLevel)}
          onChangeText={(v) => setCampaignDraft((prev) => ({ ...prev, minLevel: parseInt(v, 10) || 1 }))}
          placeholderTextColor={COLORS.textLight}
        />
        <Button title={t('campaigns.create')} onPress={handleCreateCampaign} loading={actionLoading} />
      </View>

      {campaigns.map((campaign) => (
        <View key={campaign.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.userName}>{campaign.name}</Text>
              <Text style={styles.userEmail}>{campaign.code} • {campaign.channel}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{campaign.status}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            {campaign.status === 'DRAFT' ? (
              <TouchableOpacity style={[styles.actionBtn, styles.roleChangeBtn]} onPress={() => handleLaunchCampaign(campaign)}>
                <Text style={styles.actionBtnText}>{t('campaigns.launch')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleSendTestCampaign(campaign.id)}>
              <Text style={styles.actionBtnText}>{t('campaigns.sendTest')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDeleteCampaign(campaign)}>
              <Text style={styles.actionBtnText}>{t('delete', { ns: 'common' })}</Text>
            </TouchableOpacity>
          </View>
          <RNTextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder={t('campaigns.testUserIdPlaceholder')}
            value={campaignTestUserId}
            onChangeText={setCampaignTestUserId}
            placeholderTextColor={COLORS.textLight}
          />
        </View>
      ))}
    </ScrollView>
  )

  const renderAuditLogs = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {auditStats ? (
        <View style={styles.card}>
          <Text style={styles.formTitle}>{t('audit.title')}</Text>
          <Text style={styles.description}>{t('audit.total')}: {auditStats.total ?? 0}</Text>
          <Text style={styles.description}>{t('audit.xpAdjustments')}: {(auditStats.byAction['ADJUST_XP'] ?? auditStats.byAction['XP_ADJUSTMENT'] ?? 0)}</Text>
          <Text style={styles.description}>{t('audit.campaignLaunches')}: {(auditStats.byAction['LAUNCH_CAMPAIGN'] ?? auditStats.byAction['CAMPAIGN_LAUNCH'] ?? 0)}</Text>
          <Text style={styles.description}>{t('audit.abuseResolutions')}: {(auditStats.byAction['RESOLVE_ABUSE_SIGNAL'] ?? auditStats.byAction['ABUSE_RESOLVED'] ?? 0)}</Text>
        </View>
      ) : null}

      {auditLogs.map((log, idx) => (
        <View key={log.id || idx} style={styles.card}>
          <Text style={styles.userName}>{log.action || t('audit.unknownAction')}</Text>
          <Text style={styles.userEmail}>{log.actorType || t('audit.system')} • {log.actorId || t('metrics.na')}</Text>
          <Text style={styles.description}>{log.resourceType || t('audit.none')} {log.resourceId ? `(${log.resourceId})` : ''}</Text>
          <Text style={styles.description}>{log.reason || t('audit.noDetails')}</Text>
          <Text style={styles.userEmail}>{log.createdAt ? formatDateTime(log.createdAt) : t('metrics.na')}</Text>
        </View>
      ))}
    </ScrollView>
  )

  const renderAbuseSignals = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {abuseSignals.length === 0 ? (
        <Text style={styles.userEmail}>{t('abuse.noOpenSignals')}</Text>
      ) : (
        abuseSignals.map((signal) => (
          <View key={signal.id} style={styles.card}>
            <Text style={styles.userName}>{signal.type || 'Signal'}</Text>
            <Text style={styles.userEmail}>{t('abuse.user')}: {signal.userId || t('metrics.na')}</Text>
            <Text style={styles.description}>{t('abuse.risk')}: {signal.riskScore ?? 0}</Text>
            <Text style={styles.description}>{signal.summary || t('audit.noDetails')}</Text>
            {!signal.resolved ? (
              <View style={styles.cardActions}>
                <TouchableOpacity style={[styles.actionBtn, styles.restoreBtn]} onPress={() => handleResolveAbuseSignal(signal)}>
                  <Text style={styles.actionBtnText}>{t('abuse.resolve')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.activeBadge]}>
                <Text style={styles.statusText}>{t('abuse.resolved').toUpperCase()}</Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  )

  const renderEngagement = () => (
    <View style={{ flex: 1, width: '100%' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.subTabBar, { width: '100%' }]}>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'xp-rules' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('xp-rules')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'xp-rules' && styles.subTabTextActive]}>{t('engagement.subTab.xpRules')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'levels' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('levels')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'levels' && styles.subTabTextActive]}>{t('engagement.subTab.levels')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'xp-adjust' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('xp-adjust')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'xp-adjust' && styles.subTabTextActive]}>{t('engagement.subTab.xpOps')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'campaigns' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('campaigns')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'campaigns' && styles.subTabTextActive]}>{t('engagement.subTab.campaigns')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'audit' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('audit')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'audit' && styles.subTabTextActive]}>{t('engagement.subTab.audit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'abuse' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('abuse')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'abuse' && styles.subTabTextActive]}>{t('engagement.subTab.abuse')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'metrics' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('metrics')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'metrics' && styles.subTabTextActive]}>{t('engagement.subTab.metrics')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {engagementSubTab === 'xp-rules'
        ? renderRules()
        : engagementSubTab === 'levels'
          ? renderLevels()
          : engagementSubTab === 'xp-adjust'
            ? renderXPAdjust()
            : engagementSubTab === 'campaigns'
              ? renderCampaigns()
              : engagementSubTab === 'audit'
                ? renderAuditLogs()
                : engagementSubTab === 'abuse'
                  ? renderAbuseSignals()
                  : renderMetrics()}
    </View>
  )

  if (loading) {
    return null
  }

  return renderEngagement()
}
