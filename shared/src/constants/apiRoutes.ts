/**
 * Single source of truth for API route paths, shared by the web and mobile
 * API clients.
 *
 * Values are RELATIVE paths (no `/api/v1` prefix). Each client prepends its own
 * base URL, which already includes `/api/v1`:
 *   - web:    API_URL = '/api/v1'            (same-origin proxy)
 *   - mobile: API_URL = 'http://host:port/api/v1'
 *
 * Routes with a dynamic segment are exposed as functions that interpolate the
 * segment. Callers remain responsible for URL-encoding the segment and for
 * appending query strings, matching the pre-refactor behaviour exactly.
 */
export const API_ROUTES = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    passwordResetRequest: '/auth/password-reset/request',
    passwordResetReset: '/auth/password-reset/reset',
  },
  users: {
    register: '/users/register',
    me: '/users/me',
    mePassword: '/users/me/password',
    list: '/users',
    byId: (id: string) => `/users/${id}`,
    role: (id: string) => `/users/${id}/role`,
    restore: (id: string) => `/users/${id}/restore`,
    block: (id: string) => `/users/${id}/block`,
    unblock: (id: string) => `/users/${id}/unblock`,
  },
  species: {
    list: '/species',
    byId: (id: string) => `/species/${id}`,
    translate: (id: string) => `/species/${id}/translate`,
  },
  observations: {
    list: '/observations',
    pending: '/observations/pending',
    byId: (id: string) => `/observations/${id}`,
    validate: (id: string) => `/observations/${id}/validate`,
  },
  analytics: {
    stats: '/analytics/stats',
    sizeFrequency: '/analytics/size-frequency',
    genderRatio: '/analytics/gender-ratio',
    conditionIndices: '/analytics/condition-indices',
    cw50: '/analytics/cw50',
    temporalTrends: '/analytics/temporal-trends',
    speciesDistribution: '/analytics/species-distribution',
  },
  upload: {
    url: '/upload/url',
    single: '/upload',
  },
  analyze: {
    upload: '/analyze/upload',
    crab: '/analyze/crab',
    detectView: '/analyze/detect-view',
  },
  gamification: {
    myStats: '/gamification/stats/me',
    xpHistory: '/gamification/xp-history',
    leaderboard: '/gamification/leaderboard',
  },
  engagement: {
    missionsToday: '/engagement/missions/today',
    missionsClaim: '/engagement/missions/claim',
    onboardingMe: '/engagement/onboarding/me',
    onboardingStepComplete: '/engagement/onboarding/steps/complete',
    achievements: '/engagement/achievements',
    achievementsUnlocked: '/engagement/achievements/unlocked',
    achievementsCheck: '/engagement/achievements/check',
    achievementProgress: (id: string) => `/engagement/achievements/${id}/progress`,
    insightsMe: '/engagement/insights/me',
    socialContributors: '/engagement/social/contributors',
    socialStats: '/engagement/social/stats',
    notificationPreferences: '/engagement/notification-preferences',
  },
  admin: {
    backup: '/admin/backup',
    backups: '/admin/backups',
    backupById: (fileName: string) => `/admin/backups/${fileName}`,
    backupDownload: (fileName: string) => `/admin/backups/${fileName}/download`,
    exportCsv: '/admin/export/csv',
    cleanupUsers: '/admin/cleanup-users',
    deletedUsers: '/admin/deleted-users',
    invite: '/admin/invite',
    invites: '/admin/invites',
    inviteValidate: '/admin/invite/validate',
    gamificationRules: '/admin/gamification/rules',
    gamificationRuleById: (id: string) => `/admin/gamification/rules/${id}`,
    gamificationLevels: '/admin/gamification/levels',
    gamificationLevelById: (id: string) => `/admin/gamification/levels/${id}`,
    gamificationAdjustXp: '/admin/gamification/adjust-xp',
    gamificationRecalculate: '/admin/gamification/recalculate',
    gamificationRecalcJob: (jobId: string) => `/admin/gamification/recalculate/${jobId}`,
    campaigns: '/admin/campaigns',
    campaignById: (id: string) => `/admin/campaigns/${id}`,
    campaignStatus: (id: string) => `/admin/campaigns/${id}/status`,
    campaignLaunch: (id: string) => `/admin/campaigns/${id}/launch`,
    campaignSendTest: (id: string) => `/admin/campaigns/${id}/send-test`,
    auditLogs: '/admin/audit-logs',
    auditLogStats: '/admin/audit-logs/stats',
    abuseSignals: '/admin/abuse-signals',
    abuseSignalResolve: (id: string) => `/admin/abuse-signals/${id}/resolve`,
    achievements: '/admin/achievements',
    achievementById: (id: string) => `/admin/achievements/${id}`,
    achievementAward: (id: string) => `/admin/achievements/${id}/award`,
    missions: '/admin/missions',
    missionById: (id: string) => `/admin/missions/${id}`,
    seasons: '/admin/seasons',
    seasonById: (id: string) => `/admin/seasons/${id}`,
    seasonActivate: (id: string) => `/admin/seasons/${id}/activate`,
    metrics: '/admin/metrics',
    translations: '/admin/translations',
    translationById: (id: string) => `/admin/translations/${id}`,
    translationsBulk: '/admin/translations/bulk',
    translationsUpsert: '/admin/translations/upsert',
    translationsModels: '/admin/translations/models',
  },
  fcm: {
    register: '/fcm/register',
  },
  telemetry: {
    error: '/telemetry/error',
  },
}

export type ApiRoutes = typeof API_ROUTES
