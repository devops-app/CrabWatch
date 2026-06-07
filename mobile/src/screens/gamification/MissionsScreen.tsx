import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import type { ActiveMissionDto, OnboardingStepStatusDto, OnboardingStatusDto } from '@crabwatch/shared'
import { api } from '../../services/api'
import { Card } from '../../components/common/Card'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Button } from '../../components/common/Button'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'

type Tab = 'missions' | 'onboarding'

export function MissionsScreen() {
  const { t } = useTranslation('gamification')
  const [activeTab, setActiveTab] = useState<Tab>('missions')
  const [missions, setMissions] = useState<ActiveMissionDto[]>([])
  const [onboarding, setOnboarding] = useState<{ steps: OnboardingStepStatusDto[]; completedCount: number; totalCount: number; progress: number }>({
    steps: [],
    completedCount: 0,
    totalCount: 0,
    progress: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      if (activeTab === 'missions') {
        const missions: ActiveMissionDto[] = await api.getActiveMissions()
        setMissions(Array.isArray(missions) ? missions : [])
      } else {
        const status: OnboardingStatusDto = await api.getOnboardingStatus()
        setOnboarding({
          steps: status.steps || [],
          completedCount: status.completedCount || 0,
          totalCount: status.totalCount || 0,
          progress: status.progress || 0,
        })
      }
    } catch {
      console.error('Failed to load data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeTab])

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [loadData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [loadData])

  const handleClaimMission = async (missionKey: string) => {
    setActionLoading(missionKey)
    try {
      await api.claimMission({ missionKey })
      loadData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('missions.claimFailed')
      Alert.alert(t('common.error'), message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteStep = async (step: string) => {
    setActionLoading(step)
    try {
      await api.completeOnboardingStep({ step })
      loadData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('missions.stepFailed')
      Alert.alert(t('common.error'), message)
    } finally {
      setActionLoading(null)
    }
  }

  const currentStepIndex = onboarding.completedCount

  const renderMissionItem = useCallback(({ item: mission }: { item: ActiveMissionDto }) => (
    <Card
      key={mission.id}
      padding={14}
      style={[
        styles.missionCard,
        mission.completed && styles.missionCompleted,
        mission.claimed && !mission.completed && styles.missionClaimed,
      ]}
    >
      <View style={styles.missionHeader}>
        <View style={[
          styles.missionIcon,
          mission.completed && styles.missionIconCompleted,
          mission.claimed && !mission.completed && styles.missionIconClaimed,
        ]}>
          {mission.completed ? (
            <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
          ) : mission.claimed ? (
            <Ionicons name="time" size={22} color={COLORS.primary} />
          ) : (
            <Ionicons name="document-text" size={22} color={COLORS.textSecondary} />
          )}
        </View>

        <View style={styles.missionInfo}>
          <View style={styles.missionTitleRow}>
            <Text style={styles.missionTitle} numberOfLines={1}>{mission.title}</Text>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>+{mission.xpReward} XP</Text>
            </View>
          </View>
          <Text style={styles.missionDesc} numberOfLines={2}>{mission.description}</Text>

          {!mission.completed && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {mission.progress}/{mission.targetCount}
                </Text>
                <Text style={styles.progressPercent}>
                  {mission.targetCount > 0 ? Math.min(100, Math.round((mission.progress / mission.targetCount) * 100)) : 0}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${mission.targetCount > 0 ? Math.min(100, (mission.progress / mission.targetCount) * 100) : 0}%`,
                    },
                    mission.claimed && styles.progressFillClaimed,
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      </View>

      {!mission.claimed && !mission.completed && (
        <Button
          title={actionLoading === mission.key ? t('missions.claiming') : t('missions.accept')}
          variant="primary"
          disabled={actionLoading !== null}
          onPress={() => handleClaimMission(mission.key)}
          style={styles.claimBtn}
        />
      )}

      {mission.completed && (
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
          <Text style={styles.completedText}>{t('missions.complete')}</Text>
        </View>
      )}
    </Card>
  ), [actionLoading])

  const renderEmpty = useCallback(() => (
    <Card padding={24}>
      <View style={styles.emptyState}>
        <Ionicons name="shield-outline" size={48} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>{t('missions.empty')}</Text>
        <Text style={styles.emptyText}>{t('missions.emptyHint')}</Text>
      </View>
    </Card>
  ), [t])

  const renderTabBar = useCallback(() => (
    <View style={styles.tabBar}>
      {(['missions', 'onboarding'] as Tab[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
          onPress={() => setActiveTab(tab)}
        >
          <Ionicons
            name={tab === 'missions' ? 'shield-checkmark' : 'school'}
            size={16}
            color={activeTab === tab ? '#ffffff' : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {t(tab === 'missions' ? 'missions.tab.active' : 'missions.tab.onboarding')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [activeTab])

  return (
    <SafeAreaView style={styles.container}>
      {renderTabBar()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      ) : activeTab === 'missions' ? (
        <FlatList
          data={missions}
          keyExtractor={(item) => item.id}
          renderItem={renderMissionItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        />
      ) : (
        <Card padding={16}>
          <View style={styles.onboardingProgress}>
            <View style={styles.onboardingProgressHeader}>
              <Text style={styles.onboardingProgressTitle}>{t('missions.progress')}</Text>
              <Text style={styles.onboardingProgressCount}>
                {onboarding.completedCount}/{onboarding.totalCount}
              </Text>
            </View>
            <View style={styles.onboardingBar}>
              <View
                style={[styles.onboardingFill, { width: `${onboarding.progress}%` }]}
              />
            </View>
          </View>

          <View style={styles.stepsContainer}>
            {onboarding.steps.map((step, index) => (
              <View
                key={step.step}
                style={[
                  styles.stepRow,
                  step.completed && styles.stepCompleted,
                  index === currentStepIndex && !step.completed && styles.stepCurrent,
                  index > currentStepIndex && styles.stepLocked,
                ]}
              >
                <View style={[
                  styles.stepNumber,
                  step.completed && styles.stepNumberCompleted,
                  index === currentStepIndex && !step.completed && styles.stepNumberCurrent,
                ]}>
                  {step.completed ? (
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                  ) : (
                    <Text style={styles.stepNumText}>{index + 1}</Text>
                  )}
                </View>

                <View style={styles.stepInfo}>
                  <Text style={[styles.stepTitle, step.completed && styles.stepTitleCompleted]}>{step.title}</Text>
                  <Text style={styles.stepDesc} numberOfLines={2}>{step.description}</Text>
                </View>

                <View style={styles.stepXP}>
                  <Text style={styles.stepXPText}>+{step.xpReward}</Text>
                </View>

                {!step.completed && index === currentStepIndex && (
                  <Button
                    title={actionLoading === step.step ? t('missions.doneLoading') : t('missions.done')}
                    variant="primary"
                    disabled={actionLoading !== null}
                    onPress={() => handleCompleteStep(step.step)}
                    style={styles.stepBtn}
                  />
                )}

                {step.completed && (
                  <Text style={styles.stepDone}>✓</Text>
                )}
              </View>
            ))}
          </View>
        </Card>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 8,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT['sm+'],
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyTitle: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 10,
  },
  emptyText: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  missionCard: {
  },
  missionCompleted: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.success,
  },
  missionClaimed: {
    borderColor: COLORS.primaryLight,
  },
  missionHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  missionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  missionIconCompleted: {
    backgroundColor: COLORS.successLight,
  },
  missionIconClaimed: {
    backgroundColor: COLORS.background,
  },
  missionInfo: {
    flex: 1,
  },
  missionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  missionTitle: {
    fontSize: FONT.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: COLORS.warningLight,
  },
  xpBadgeText: {
    fontSize: FONT.xs,
    fontWeight: '600',
    color: COLORS.accent,
  },
  missionDesc: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
  },
  progressPercent: {
    fontSize: FONT.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressFillClaimed: {
    backgroundColor: COLORS.primary,
  },
  claimBtn: {
    marginTop: 10,
    marginLeft: 52,
    width: 100,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginLeft: 52,
  },
  completedText: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.success,
  },
  onboardingProgress: {
    marginBottom: 16,
  },
  onboardingProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  onboardingProgressTitle: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  onboardingProgressCount: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
  },
  onboardingBar: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  onboardingFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  stepsContainer: {
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  stepCompleted: {
    backgroundColor: COLORS.successLight,
  },
  stepCurrent: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  stepLocked: {
    opacity: 0.5,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberCompleted: {
    backgroundColor: COLORS.success,
  },
  stepNumberCurrent: {
    backgroundColor: COLORS.primary,
  },
  stepNumText: {
    fontSize: FONT['sm+'],
    fontWeight: '700',
    color: '#ffffff',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  stepTitleCompleted: {
    color: COLORS.success,
    textDecorationLine: 'line-through',
  },
  stepDesc: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  stepXP: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: COLORS.warningLight,
  },
  stepXPText: {
    fontSize: FONT.xs,
    fontWeight: '600',
    color: COLORS.accent,
  },
  stepBtn: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    height: 28,
  },
  stepDone: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: COLORS.success,
  },
})
