import { Prisma, PrismaClient, UserRole } from '@prisma/client'
import { getContainer } from './container'

/**
 * Cast a value to Prisma's InputJsonValue for JSON column writes.
 * Prisma 5.x strict JSON types reject plain Record<string, unknown> without explicit casting.
 */
function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

let _prisma: PrismaClient
function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = getContainer().prisma
  }
  return _prisma
}

// ==================== CAMPAIGN SERVICE ====================

export interface CampaignContentItem {
  title: string
  body: string
  payload?: Record<string, unknown>
}

export type CampaignContent = CampaignContentItem | Record<string, CampaignContentItem>

export interface CampaignAudienceFilter {
  minLevel?: number
  roles?: string[]
  minStreak?: number
  [key: string]: unknown
}

export interface CampaignCreateInput {
  code: string
  name: string
  channel: string
  audienceFilter: CampaignAudienceFilter
  content: CampaignContent
  scheduleAt?: string
}

/**
 * Resolve campaign content for a specific locale.
 * Supports both legacy format ({ title, body }) and locale-map format
 * ({ en: { title, body }, ms: { title, body } }).
 * Falls back to English if the requested locale is not available.
 */
function resolveContentForLocale(content: CampaignContent, locale: string): CampaignContentItem {
  const hasLocaleKey = typeof content === 'object' && !Array.isArray(content) && ('en' in content || 'ms' in content)
  if (hasLocaleKey) {
    const localized = (content as Record<string, CampaignContentItem>)[locale]
    if (localized && localized.title) return localized
    return (content as Record<string, CampaignContentItem>).en || { title: '', body: '' }
  }
  const item = content as CampaignContentItem
  return { title: item.title || '', body: item.body || '', payload: item.payload }
}

export async function createCampaign(input: CampaignCreateInput, adminId: string): Promise<{ id: string; code: string; name: string }> {
  const campaign = await getPrisma().campaign.create({
    data: {
      code: input.code,
      name: input.name,
      channel: input.channel as 'PUSH' | 'EMAIL' | 'IN_APP',
      status: input.scheduleAt ? 'SCHEDULED' : 'DRAFT',
      audienceFilter: toJsonInput(input.audienceFilter),
      content: toJsonInput(input.content),
      scheduleAt: input.scheduleAt ? new Date(input.scheduleAt) : null,
      createdByAdminId: adminId,
    },
  })

  await getPrisma().auditLog.create({
    data: {
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'CREATE_CAMPAIGN',
      resourceType: 'campaign',
      resourceId: campaign.id,
      afterState: { code: input.code, name: input.name },
    },
  })

  return campaign
}

export interface CampaignListItem {
  id: string
  code: string
  name: string
  channel: string
  status: string
  audienceFilter: CampaignAudienceFilter
  content: CampaignContent
  scheduleAt: Date | null
  startedAt: Date | null
  completedAt: Date | null
  createdByAdminId: string | null
  createdAt: Date
  updatedAt: Date
  _count: { deliveries: number }
}

export async function listCampaigns(
  filter?: { status?: string }
): Promise<CampaignListItem[]> {
  const where: { status?: string } = {}
  if (filter?.status) {
    where.status = filter.status
  }
  const results = await getPrisma().campaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { deliveries: true },
      },
    },
  })
  return results.map(r => ({
    ...r,
    audienceFilter: r.audienceFilter as unknown as CampaignAudienceFilter,
    content: r.content as unknown as CampaignContent,
  })) as CampaignListItem[]
}

export interface CampaignDetail {
  id: string
  code: string
  name: string
  channel: string
  status: string
  audienceFilter: CampaignAudienceFilter
  content: CampaignContent
  scheduleAt: Date | null
  startedAt: Date | null
  completedAt: Date | null
  createdByAdminId: string | null
  createdAt: Date
  updatedAt: Date
  deliveries: Array<{ id: string; userId: string; status: string; sentAt: Date | null }>
}

export async function getCampaign(id: string): Promise<CampaignDetail | null> {
  const result = await getPrisma().campaign.findUnique({
    where: { id },
    include: {
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })
  if (!result) return null
  return {
    ...result,
    audienceFilter: result.audienceFilter as unknown as CampaignAudienceFilter,
    content: result.content as unknown as CampaignContent,
  } as CampaignDetail
}

export async function updateCampaignStatus(
  id: string,
  status: string,
  adminId: string
): Promise<{ id: string; status: string }> {
  const campaign = await getPrisma().campaign.findUnique({ where: { id } })
  if (!campaign) throw new Error('Campaign not found')

  const updated = await getPrisma().campaign.update({
    where: { id },
    data: {
      status,
      startedAt: status === 'ACTIVE' ? new Date() : campaign.startedAt,
      completedAt: status === 'COMPLETED' ? new Date() : campaign.completedAt,
    },
  })

  await getPrisma().auditLog.create({
    data: {
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'UPDATE_CAMPAIGN_STATUS',
      resourceType: 'campaign',
      resourceId: id,
      beforeState: { status: campaign.status },
      afterState: { status },
    },
  })

  return updated
}

export async function launchCampaign(id: string, adminId: string): Promise<{ sent: number; failed: number }> {
  const campaign = await getPrisma().campaign.findUnique({ where: { id } })
  if (!campaign) throw new Error('Campaign not found')

  const audienceFilter = campaign.audienceFilter as unknown as CampaignAudienceFilter
  const content = campaign.content as unknown as CampaignContent

  // Build audience query
  const where: { level?: { gte: number }; role?: { in: UserRole[] }; currentStreak?: { gte: number } } = {}
  if (audienceFilter.minLevel) {
    where.level = { gte: audienceFilter.minLevel }
  }
  if (audienceFilter.roles && audienceFilter.roles.length > 0) {
    where.role = { in: audienceFilter.roles as UserRole[] }
  }
  if (audienceFilter.minStreak) {
    where.currentStreak = { gte: audienceFilter.minStreak }
  }

  const users = await getPrisma().user.findMany({
    where,
    select: { id: true, name: true, preferredLocale: true },
  })

  let sent = 0
  let failed = 0

  for (const user of users) {
    try {
      const userLocale = user.preferredLocale || 'en'
      const resolved = resolveContentForLocale(content, userLocale)
      await getPrisma().notificationDelivery.create({
        data: {
          campaignId: campaign.id,
          userId: user.id,
          channel: campaign.channel,
          category: 'campaign',
          title: resolved.title,
          body: resolved.body,
          payload: resolved.payload ? toJsonInput(resolved.payload) : undefined,
          status: 'SENT',
          sentAt: new Date(),
        },
      })
      sent++
    } catch {
      failed++
    }
  }

  await getPrisma().campaign.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      startedAt: new Date(),
    },
  })

  await getPrisma().auditLog.create({
    data: {
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'LAUNCH_CAMPAIGN',
      resourceType: 'campaign',
      resourceId: id,
      afterState: { sent, failed, totalUsers: users.length },
    },
  })

  return { sent, failed }
}

export async function deleteCampaign(id: string, adminId: string): Promise<void> {
  const campaign = await getPrisma().campaign.findUnique({ where: { id } })
  if (!campaign) throw new Error('Campaign not found')

  await getPrisma().campaign.delete({ where: { id } })

  await getPrisma().auditLog.create({
    data: {
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'DELETE_CAMPAIGN',
      resourceType: 'campaign',
      resourceId: id,
      beforeState: { code: campaign.code, name: campaign.name },
    },
  })
}

export async function sendTestCampaign(
  id: string,
  userId: string,
  adminId: string
): Promise<{ sent: boolean; userId: string }> {
  const campaign = await getPrisma().campaign.findUnique({ where: { id } })
  if (!campaign) throw new Error('Campaign not found')

  const content = campaign.content as unknown as CampaignContent

  const user = await getPrisma().user.findUnique({ where: { id: userId }, select: { id: true, preferredLocale: true } })
  if (!user) throw new Error('User not found')

  const resolved = resolveContentForLocale(content, user.preferredLocale || 'en')
  await getPrisma().notificationDelivery.create({
    data: {
      campaignId: campaign.id,
      userId,
      channel: campaign.channel,
      category: 'campaign-test',
      title: resolved.title,
      body: resolved.body,
      payload: resolved.payload ? toJsonInput(resolved.payload) : undefined,
      status: 'SENT',
      sentAt: new Date(),
    },
  })

  await getPrisma().auditLog.create({
    data: {
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'TEST_SEND_CAMPAIGN',
      resourceType: 'campaign',
      resourceId: id,
      afterState: { userId, channel: campaign.channel },
    },
  })

  return { sent: true, userId }
}

// ==================== AUDIT LOG SERVICE ====================

export interface AuditLogFilter {
  action?: string
  resourceType?: string
  actorId?: string
  limit?: number
  offset?: number
}

export interface AuditLogEntry {
  id: string
  actorType: string
  actorId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  reason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export async function getAuditLogs(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
  const where: { action?: string; resourceType?: string; actorId?: string } = {}
  if (filter.action) where.action = filter.action
  if (filter.resourceType) where.resourceType = filter.resourceType
  if (filter.actorId) where.actorId = filter.actorId

  const results = await getPrisma().auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filter.limit || 50,
    skip: filter.offset || 0,
  })
  return results.map(r => ({
    ...r,
    beforeState: r.beforeState as Record<string, unknown> | null,
    afterState: r.afterState as Record<string, unknown> | null,
  })) as AuditLogEntry[]
}

export async function getAuditLogStats(): Promise<{
  totalLogs: number
  logsToday: number
  logsThisWeek: number
  topActions: Array<{ action: string; count: number }>
  topActors: Array<{ actorId: string; name: string; count: number }>
}> {
  const totalLogs = await getPrisma().auditLog.count()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const logsToday = await getPrisma().auditLog.count({ where: { createdAt: { gte: today } } })

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const logsThisWeek = await getPrisma().auditLog.count({ where: { createdAt: { gte: weekAgo } } })

  const actionGroups = await getPrisma().auditLog.groupBy({
    by: ['action'],
    _count: { action: true },
    orderBy: { _count: { action: 'desc' } },
    take: 10,
  })

  const topActions = actionGroups.map((g) => ({
    action: g.action,
    count: g._count.action,
  }))

  const actorGroups = await getPrisma().auditLog.groupBy({
    by: ['actorId'],
    _count: { actorId: true },
    orderBy: { _count: { actorId: 'desc' } },
    take: 10,
  })

  const topActors = await Promise.all(
    actorGroups.map(async (g) => {
      const user = g.actorId ? await getPrisma().user.findUnique({ where: { id: g.actorId }, select: { name: true } }) : null
      return {
        actorId: g.actorId || 'SYSTEM',
        name: user?.name || 'System',
        count: g._count.actorId,
      }
    })
  )

  return { totalLogs, logsToday, logsThisWeek, topActions, topActors }
}
