'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { useTranslations } from 'next-intl'
import type { ActiveMissionDto, OnboardingStatusDto } from '@crabwatch/shared'

interface MissionsClientProps {
  initialMissions?: ActiveMissionDto[] | null
  initialOnboarding?: OnboardingStatusDto | null
}

export function MissionsClient({
  initialMissions,
  initialOnboarding,
}: MissionsClientProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'missions' | 'onboarding'>('missions')
  const [missions, setMissions] = useState<ActiveMissionDto[]>(initialMissions ?? [])
  const [onboarding, setOnboarding] = useState<OnboardingStatusDto | null>(initialOnboarding ?? null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const t = useTranslations('gamification.missions')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
        const missionsRaw: any[] = await api.getActiveMissions().catch(() => [])
        const missionsData: ActiveMissionDto[] = (Array.isArray(missionsRaw) ? missionsRaw : []).map((m: any) => ({
          id: m.code || m.id,
          code: m.code || m.id,
          key: m.code || m.id,
          title: m.title || m.name || 'Mission',
          name: m.title || m.name || 'Mission',
          description: m.description || '',
          xpReward: m.xpReward || 0,
          claimed: m.claimed || m.completed,
          completed: m.completed,
          progress: m.progress || 0,
          targetCount: m.targetCount || 1,
        }))
        const onboardingData: OnboardingStatusDto | null = await api.getOnboardingStatus().catch(() => null)
        setMissions(missionsData)
      setOnboarding(onboardingData)
    } catch (err) {
      logger.error('Failed to load missions/onboarding data', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (missions.length === 0 && !onboarding) {
      loadData()
    }
  }, [loadData, missions.length, onboarding])

  const handleClaimMission = async (missionKey: string) => {
    setActionLoading(missionKey)
    try {
      await api.claimMission({ missionKey })
      loadData()
    } catch (err: unknown) {
      logger.error('Failed to claim mission', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteOnboardingStep = async (step: string) => {
    setActionLoading(step)
    try {
      await api.completeOnboardingStep({ step })
      loadData()
    } catch (err: unknown) {
      logger.error('Failed to complete onboarding step', err)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-ocean-900">{t('title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('missions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'missions'
                ? 'bg-ocean-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('tabs.daily')}
          </button>
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'onboarding'
                ? 'bg-ocean-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('tabs.onboarding')}
          </button>
        </div>
      </div>

      {loading && missions.length === 0 && !onboarding ? (
        <div className="card">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 py-4 animate-pulse border-b border-gray-100 last:border-0">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-32 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'missions' ? (
        <div className="space-y-4">
          {missions.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-400 text-lg">{t('noMissions')}</p>
              <p className="text-gray-400 text-sm mt-2">{t('checkBack')}</p>
            </div>
          ) : (
            missions.map((mission) => (
              <div
                key={mission.key}
                className={`card border-2 transition-all ${
                  mission.completed
                    ? 'border-green-200 bg-green-50'
                    : mission.claimed
                    ? 'border-ocean-200 bg-ocean-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                    mission.completed
                      ? 'bg-green-100'
                      : mission.claimed
                      ? 'bg-ocean-100'
                      : 'bg-gray-100'
                  }`}>
                    {mission.completed ? '🎉' : mission.claimed ? '⏳' : '📋'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ocean-800">{mission.title}</h3>
                     <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                          {t('xpReward', { xp: mission.xpReward })}
                        </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{t('progress', { current: mission.progress, target: mission.targetCount })}</span>
                        <span>{Math.min(100, Math.round((mission.progress / mission.targetCount) * 100))}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            mission.completed ? 'bg-green-500' : 'bg-ocean-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (mission.progress / mission.targetCount) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {!mission.claimed && !mission.completed && (
                    <button
                      onClick={() => handleClaimMission(mission.key)}
                      disabled={actionLoading === mission.key}
                      className="px-4 py-2 bg-ocean-600 text-white rounded-lg text-sm hover:bg-ocean-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === mission.key ? t('claiming') : t('claim')}
                    </button>
                  )}
                  {mission.completed && (
<span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {t('completed')}
                        </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : onboarding ? (
        <div className="card">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-ocean-800">{t('onboardingProgress')}</h2>
              <span className="text-sm text-gray-500">
                {t('stepsCount', { current: onboarding.completedCount, total: onboarding.totalCount })}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-ocean-500 h-3 rounded-full transition-all"
                style={{ width: `${onboarding.progress}%` }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {onboarding.steps.map((step, index) => (
              <div
                key={step.step}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                  step.completed
                    ? 'border-green-200 bg-green-50'
                    : index === onboarding.completedCount
                    ? 'border-ocean-200 bg-ocean-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step.completed
                    ? 'bg-green-100 text-green-800'
                    : index === onboarding.completedCount
                    ? 'bg-ocean-100 text-ocean-800'
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {step.completed ? '✓' : index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-ocean-800">{step.title}</h3>
                </div>
<span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                      {t('xpReward', { xp: step.xpReward })}
                    </span>
                {!step.completed && index === onboarding.completedCount && (
                  <button
                    onClick={() => handleCompleteOnboardingStep(step.step)}
                    disabled={actionLoading === step.step}
                    className="px-4 py-2 bg-ocean-600 text-white rounded-lg text-sm hover:bg-ocean-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === step.step ? t('completing') : t('markComplete')}
                  </button>
                )}
                {step.completed && (
                  <span className="text-sm text-green-600 font-medium">{t('done')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-lg">{t('notAvailable')}</p>
        </div>
      )}
    </>
  )
}
