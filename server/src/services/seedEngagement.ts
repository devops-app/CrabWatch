import prisma from '../config/database'

const DEFAULT_RULES = [
  { actionType: 'OBSERVATION_SUBMIT', name: 'Default', description: 'XP awarded when user submits an observation', xpReward: 5 },
  { actionType: 'OBSERVATION_APPROVED', name: 'Default', description: 'Additional XP when observation is approved by researcher', xpReward: 10 },
  { actionType: 'FIRST_OBSERVATION', name: 'Default', description: 'Bonus XP for a user\'s very first observation', xpReward: 20 },
  { actionType: 'NEW_SPECIES', name: 'Default', description: 'Bonus XP when user submits a species they haven\'t submitted before', xpReward: 5 },
  { actionType: 'VALIDATION', name: 'Default', description: 'XP awarded to researcher for validating an observation', xpReward: 3 },
  { actionType: 'STREAK_BONUS', name: 'Default', description: 'Bonus XP for maintaining daily observation streak', xpReward: 2 },
  { actionType: 'MISSION_COMPLETE', name: 'Default', description: 'XP awarded when a mission is completed', xpReward: 10 },
  { actionType: 'ACHIEVEMENT_UNLOCK', name: 'Default', description: 'XP awarded when an achievement is unlocked', xpReward: 15 },
]

const DEFAULT_LEVELS = [
  { level: 1, xpThreshold: 0, title: 'Crab Scout' },
  { level: 5, xpThreshold: 100, title: 'Tidal Tracker' },
  { level: 10, xpThreshold: 300, title: 'Mangrove Explorer' },
  { level: 15, xpThreshold: 600, title: 'Shell Collector' },
  { level: 20, xpThreshold: 1000, title: 'Coastal Researcher' },
  { level: 30, xpThreshold: 2000, title: 'Estuary Guardian' },
  { level: 40, xpThreshold: 3500, title: 'Molting Master' },
  { level: 50, xpThreshold: 5500, title: 'Crab Whisperer' },
  { level: 60, xpThreshold: 8000, title: 'Mangrove Sentinel' },
  { level: 75, xpThreshold: 12000, title: 'Apex Observer' },
  { level: 90, xpThreshold: 18000, title: 'Master Naturalist' },
  { level: 100, xpThreshold: 25000, title: 'Keeper of the Mangroves' },
]

const DEFAULT_ONBOARDING_STEPS = [
  { key: 'complete_profile', title: 'Complete Your Profile', description: 'Add your contact details and location', actionType: 'PROFILE_COMPLETE', xpReward: 5 },
  { key: 'first_observation', title: 'Submit Your First Observation', description: 'Take a photo and submit your first crab observation', actionType: 'FIRST_OBSERVATION', xpReward: 20 },
  { key: 'learn_species', title: 'Learn About Species', description: 'Browse the species guide', actionType: 'SPECIES_VIEW', xpReward: 5 },
  { key: 'second_observation', title: 'Submit Another Observation', description: 'Build your observation streak', actionType: 'OBSERVATION_SUBMIT', xpReward: 5 },
  { key: 'check_leaderboard', title: 'Check the Leaderboard', description: 'See how you rank among other observers', actionType: 'LEADERBOARD_VIEW', xpReward: 5 },
]

async function seedGamificationRules(): Promise<void> {
  for (const rule of DEFAULT_RULES) {
    await prisma.gamificationRule.upsert({
      where: { actionType_name: { actionType: rule.actionType as any, name: rule.name } },
      update: {},
      create: {
        actionType: rule.actionType as any,
        name: rule.name,
        description: rule.description,
        xpReward: rule.xpReward,
      },
    })
  }
  console.log(`[SEED] GamificationRules: ${DEFAULT_RULES.length} rules upserted`)
}

async function seedLevelConfigs(): Promise<void> {
  for (const lvl of DEFAULT_LEVELS) {
    await prisma.levelConfig.upsert({
      where: { level: lvl.level },
      update: {},
      create: {
        level: lvl.level,
        xpThreshold: lvl.xpThreshold,
        title: lvl.title,
      },
    })
  }
  console.log(`[SEED] LevelConfigs: ${DEFAULT_LEVELS.length} levels upserted`)
}

async function seedOnboardingFlow(): Promise<void> {
  await prisma.onboardingFlow.upsert({
    where: { code: 'default_v1' },
    update: {},
    create: {
      code: 'default_v1',
      version: 1,
      name: 'Welcome to CrabWatch',
      active: true,
      steps: DEFAULT_ONBOARDING_STEPS,
    },
  })
  console.log('[SEED] OnboardingFlow: default_v1 upserted')
}

async function seedMissionDefinitions(): Promise<void> {
  const missions = [
    {
      code: 'daily_submit_1',
      name: 'Daily Observer',
      description: 'Submit 1 observation today',
      cadence: 'DAILY',
      criteria: [{ field: 'dailySubmissions', operator: 'gte', value: 1 }],
      xpReward: 10,
    },
    {
      code: 'daily_submit_3',
      name: 'Active Observer',
      description: 'Submit 3 observations today',
      cadence: 'DAILY',
      criteria: [{ field: 'dailySubmissions', operator: 'gte', value: 3 }],
      xpReward: 20,
    },
    {
      code: 'weekly_species_2',
      name: 'Species Hunter',
      description: 'Submit 2 different species this week',
      cadence: 'WEEKLY',
      criteria: [{ field: 'weeklySpecies', operator: 'gte', value: 2 }],
      xpReward: 25,
    },
    {
      code: 'weekly_submit_5',
      name: 'Weekly Champion',
      description: 'Submit 5 observations this week',
      cadence: 'WEEKLY',
      criteria: [{ field: 'weeklySubmissions', operator: 'gte', value: 5 }],
      xpReward: 30,
    },
  ]

  for (const mission of missions) {
    await prisma.missionDefinition.upsert({
      where: { code: mission.code },
      update: {},
      create: {
        code: mission.code,
        name: mission.name,
        description: mission.description,
        cadence: mission.cadence as any,
        criteria: mission.criteria,
        xpReward: mission.xpReward,
      },
    })
  }
  console.log(`[SEED] MissionDefinitions: ${missions.length} missions upserted`)
}

async function seedDefaultAchievements(): Promise<void> {
  const achievements = [
    { code: 'first_observation', name: 'First Blood', description: 'Submit your first observation', category: 'OBSERVATION', rarity: 'COMMON', requirements: [{ field: 'totalSubmissions', operator: 'gte', value: 1 }], xpReward: 10 },
    { code: 'ten_observations', name: 'Shell Collector', description: 'Submit 10 observations', category: 'OBSERVATION', rarity: 'COMMON', requirements: [{ field: 'totalSubmissions', operator: 'gte', value: 10 }], xpReward: 25 },
    { code: 'fifty_observations', name: 'Claw Master', description: 'Submit 50 observations', category: 'OBSERVATION', rarity: 'UNCOMMON', requirements: [{ field: 'totalSubmissions', operator: 'gte', value: 50 }], xpReward: 50 },
    { code: 'hundred_observations', name: 'Master Observer', description: 'Submit 100 observations', category: 'OBSERVATION', rarity: 'RARE', requirements: [{ field: 'totalSubmissions', operator: 'gte', value: 100 }], xpReward: 100 },
    { code: 'five_hundred_observations', name: 'Legendary', description: 'Submit 500 observations', category: 'OBSERVATION', rarity: 'LEGENDARY', requirements: [{ field: 'totalSubmissions', operator: 'gte', value: 500 }], xpReward: 250 },
    { code: 'first_species', name: 'Mud Crab Discoverer', description: 'Submit your first species', category: 'SPECIES', rarity: 'COMMON', requirements: [{ field: 'speciesCount', operator: 'gte', value: 1 }], xpReward: 10 },
    { code: 'five_species', name: '5 Species Finder', description: 'Submit 5 different species', category: 'SPECIES', rarity: 'COMMON', requirements: [{ field: 'speciesCount', operator: 'gte', value: 5 }], xpReward: 25 },
    { code: 'ten_species', name: '10 Species Finder', description: 'Submit 10 different species', category: 'SPECIES', rarity: 'UNCOMMON', requirements: [{ field: 'speciesCount', operator: 'gte', value: 10 }], xpReward: 50 },
    { code: 'twenty_species', name: '20 Species Finder', description: 'Submit 20 different species', category: 'SPECIES', rarity: 'RARE', requirements: [{ field: 'speciesCount', operator: 'gte', value: 20 }], xpReward: 100 },
    { code: 'seven_day_streak', name: '7-Day Streak', description: 'Maintain a 7-day observation streak', category: 'EXPLORATION', rarity: 'UNCOMMON', requirements: [{ field: 'longestStreak', operator: 'gte', value: 7 }], xpReward: 40 },
    { code: 'thirty_day_streak', name: '30-Day Streak', description: 'Maintain a 30-day observation streak', category: 'EXPLORATION', rarity: 'RARE', requirements: [{ field: 'longestStreak', operator: 'gte', value: 30 }], xpReward: 100 },
    { code: 'trusted_eye', name: 'Trusted Eye', description: 'Get 10 approved observations with <10% rejection rate', category: 'QUALITY', rarity: 'UNCOMMON', requirements: [{ field: 'approvedCount', operator: 'gte', value: 10 }], xpReward: 50 },
    { code: 'data_champion', name: 'Data Champion', description: 'Get 50 approved observations', category: 'QUALITY', rarity: 'RARE', requirements: [{ field: 'approvedCount', operator: 'gte', value: 50 }], xpReward: 100 },
    { code: 'level_5', name: 'Level 5 Achieved', description: 'Reach level 5', category: 'OBSERVATION', rarity: 'COMMON', requirements: [{ field: 'level', operator: 'gte', value: 5 }], xpReward: 20 },
    { code: 'level_10', name: 'Level 10 Achieved', description: 'Reach level 10', category: 'OBSERVATION', rarity: 'UNCOMMON', requirements: [{ field: 'level', operator: 'gte', value: 10 }], xpReward: 40 },
    { code: 'level_25', name: 'Level 25 Achieved', description: 'Reach level 25', category: 'OBSERVATION', rarity: 'RARE', requirements: [{ field: 'level', operator: 'gte', value: 25 }], xpReward: 75 },
    { code: 'level_50', name: 'Level 50 Achieved', description: 'Reach level 50', category: 'OBSERVATION', rarity: 'LEGENDARY', requirements: [{ field: 'level', operator: 'gte', value: 50 }], xpReward: 200 },
    { code: 'midnight_observer', name: 'Midnight Observer', description: 'Submit an observation between 00:00-01:00', category: 'HIDDEN', rarity: 'RARE', requirements: [{ field: 'nightObservations', operator: 'gte', value: 1 }], xpReward: 30, isHidden: true },
    { code: 'weekend_warrior', name: 'Weekend Warrior', description: 'Submit 5 observations on weekends', category: 'EXPLORATION', rarity: 'COMMON', requirements: [{ field: 'weekendObservations', operator: 'gte', value: 5 }], xpReward: 20 },
  ]

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: {},
      create: {
        code: ach.code,
        name: ach.name,
        description: ach.description,
        category: ach.category,
        rarity: ach.rarity,
        requirements: ach.requirements,
        xpReward: ach.xpReward,
        isHidden: ach.isHidden || false,
      },
    })
  }
  console.log(`[SEED] Achievements: ${achievements.length} achievements upserted`)
}

async function isEngagementFoundationSeeded(): Promise<boolean> {
  const [coreRuleCount, maxLevelCount, onboardingCount, coreMissionCount, coreAchievementCount] = await Promise.all([
    prisma.gamificationRule.count({
      where: { actionType: 'OBSERVATION_SUBMIT', name: 'Default' },
    }),
    prisma.levelConfig.count({
      where: { level: 100 },
    }),
    prisma.onboardingFlow.count({
      where: { code: 'default_v1' },
    }),
    prisma.missionDefinition.count({
      where: { code: 'daily_submit_1' },
    }),
    prisma.achievement.count({
      where: { code: 'first_observation' },
    }),
  ])

  return (
    coreRuleCount >= 1
    && maxLevelCount >= 1
    && onboardingCount >= 1
    && coreMissionCount >= 1
    && coreAchievementCount >= 1
  )
}

export async function seedEngagement(): Promise<void> {
  try {
    const alreadySeeded = await isEngagementFoundationSeeded()
    if (alreadySeeded) {
      console.log('[SEED] Engagement foundation already present, skipping startup seed')
      return
    }

    await seedGamificationRules()
    await seedLevelConfigs()
    await seedOnboardingFlow()
    await seedMissionDefinitions()
    await seedDefaultAchievements()
    console.log('[SEED] Engagement foundation seeded successfully')
  } catch (error) {
    console.error('[SEED] Error seeding engagement data:', error)
  }
}

// Run directly if called from CLI
if (process.argv[1] === __filename) {
  seedEngagement().then(() => process.exit(0))
}
