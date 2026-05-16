import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { Card } from '../../components/common/Card'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Button } from '../../components/common/Button'
import { COLORS } from '../../utils/constants'

type Tab = 'missions' | 'onboarding'

interface MissionItem {
  id: string
  missionKey: string
  title: string
  description: string
  xpReward: number
  claimed: boolean
  completed: boolean
  progress: number
  target: number
  status: string
}

interface OnboardingStep {
  step: string
  title: string
  description: string
  xpReward: number
  completed: boolean
}

export function MissionsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('missions')
  const [missions, setMissions] = useState<MissionItem[]>([])
  const [onboarding, setOnboarding] = useState<{ steps: OnboardingStep[]; completedCount: number; totalCount: number; progress: number }>({
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
        const data: any = await api.getActiveMissions()
        const items = data?.items || []
        const mapped: MissionItem[] = items.map((item: any) => ({
          id: item.id,
          missionKey: item.mission?.code || item.id,
          title: item.mission?.name || 'Mission',
          description: item.mission?.description || '',
          xpReward: item.mission?.xpReward || 0,
          claimed: item.status === 'CLAIMED' || item.status === 'COMPLETED',
          completed: item.status === 'COMPLETED',
          progress: item.progressValue || 0,
          target: item.targetValue || 0,
          status: item.status,
        }))
        setMissions(mapped)
      } else {
        const data: any = await api.getOnboardingStatus()
        const steps = data?.steps || []
        const mapped: OnboardingStep[] = steps.map((s: any) => ({
          step: s.stepKey || s.step,
          title: s.title || s.stepKey || s.step,
          description: s.description || '',
          xpReward: s.xpReward || 0,
          completed: s.status === 'COMPLETED',
        }))
        setOnboarding({
          steps: mapped,
          completedCount: data?.completedCount || 0,
          totalCount: data?.totalCount || mapped.length,
          progress: data?.completionPercentage || 0,
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
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to claim mission')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteStep = async (step: string) => {
    setActionLoading(step)
    try {
      await api.completeOnboardingStep({ step })
      loadData()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete step')
    } finally {
      setActionLoading(null)
    }
  }

  const currentStepIndex = onboarding.completedCount

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
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
                {tab === 'missions' ? 'Daily Missions' : 'Onboarding'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
          </View>
        ) : activeTab === 'missions' ? (
          <>
            {missions.length === 0 ? (
              <Card padding={24}>
                <View style={styles.emptyState}>
                  <Ionicons name="shield-outline" size={48} color={COLORS.textLight} />
                  <Text style={styles.emptyTitle}>No missions available</Text>
                  <Text style={styles.emptyText}>Check back tomorrow for new missions!</Text>
                </View>
              </Card>
            ) : (
              missions.map((mission) => (
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
                              {mission.progress}/{mission.target}
                            </Text>
                            <Text style={styles.progressPercent}>
                              {mission.target > 0 ? Math.min(100, Math.round((mission.progress / mission.target) * 100)) : 0}%
                            </Text>
                          </View>
                          <View style={styles.progressBar}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${mission.target > 0 ? Math.min(100, (mission.progress / mission.target) * 100) : 0}%`,
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
                      title={actionLoading === mission.missionKey ? 'Claiming...' : 'Claim'}
                      variant="primary"
                      disabled={actionLoading !== null}
                      onPress={() => handleClaimMission(mission.missionKey)}
                      style={styles.claimBtn}
                    />
                  )}

                  {mission.completed && (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                      <Text style={styles.completedText}>Completed</Text>
                    </View>
                  )}
                </Card>
              ))
            )}
          </>
        ) : (
          <Card padding={16}>
            <View style={styles.onboardingProgress}>
              <View style={styles.onboardingProgressHeader}>
                <Text style={styles.onboardingProgressTitle}>Progress</Text>
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
                      title={actionLoading === step.step ? '...' : 'Done'}
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
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
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
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  missionCard: {
    marginBottom: 8,
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
    fontSize: 15,
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
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
  missionDesc: {
    fontSize: 13,
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
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  progressPercent: {
    fontSize: 11,
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
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  onboardingProgressCount: {
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  stepTitleCompleted: {
    color: COLORS.success,
    textDecorationLine: 'line-through',
  },
  stepDesc: {
    fontSize: 12,
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
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
  stepBtn: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    height: 28,
  },
  stepDone: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
  },
})
