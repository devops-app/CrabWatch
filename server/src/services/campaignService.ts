import prisma from '../config/database'

// ==================== CAMPAIGN SERVICE ====================

export interface CampaignCreateInput {
  code: string
  name: string
  channel: string
  audienceFilter: any
  content: { title: string; body: string; payload?: any }
  scheduleAt?: string
}

export async function createCampaign(input: CampaignCreateInput, adminId: string): Promise<any> {
  const campaign = await prisma.campaign.create({
    data: {
      code: input.code,
      name: input.name,
      channel: input.channel as any,
      status: input.scheduleAt ? 'SCHEDULED' : 'DRAFT',
      audienceFilter: input.audienceFilter,
      content: input.content,
      scheduleAt: input.scheduleAt ? new Date(input.scheduleAt) : null,
      createdByAdminId: adminId,
    },
  })

  await prisma.auditLog.create({
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

export async function listCampaigns(
  filter?: { status?: string }
): Promise<any[]> {
  const where: any = {}
  if (filter?.status) {
    where.status = filter.status
  }
  return prisma.campaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { deliveries: true },
      },
    },
  })
}

export async function getCampaign(id: string): Promise<any | null> {
  return prisma.campaign.findUnique({
    where: { id },
    include: {
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })
}

export async function updateCampaignStatus(
  id: string,
  status: string,
  adminId: string
): Promise<any> {
  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) throw new Error('Campaign not found')

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      status,
      startedAt: status === 'ACTIVE' ? new Date() : campaign.startedAt,
      completedAt: status === 'COMPLETED' ? new Date() : campaign.completedAt,
    },
  })

  await prisma.auditLog.create({
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
  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) throw new Error('Campaign not found')

  const audienceFilter = campaign.audienceFilter as any
  const content = campaign.content as any

  // Build audience query
  const where: any = {}
  if (audienceFilter.minLevel) {
    where.level = { gte: audienceFilter.minLevel }
  }
  if (audienceFilter.roles && audienceFilter.roles.length > 0) {
    where.role = { in: audienceFilter.roles }
  }
  if (audienceFilter.minStreak) {
    where.currentStreak = { gte: audienceFilter.minStreak }
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true },
  })

  let sent = 0
  let failed = 0

  for (const user of users) {
    try {
      await prisma.notificationDelivery.create({
        data: {
          campaignId: campaign.id,
          userId: user.id,
          channel: campaign.channel,
          category: 'campaign',
          title: content.title,
          body: content.body,
          payload: content.payload || null,
          status: 'SENT',
          sentAt: new Date(),
        },
      })
      sent++
    } catch {
      failed++
    }
  }

  await prisma.campaign.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      startedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
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
  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) throw new Error('Campaign not found')

  await prisma.campaign.delete({ where: { id } })

  await prisma.auditLog.create({
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
  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) throw new Error('Campaign not found')

  const content = campaign.content as any

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  await prisma.notificationDelivery.create({
    data: {
      campaignId: campaign.id,
      userId,
      channel: campaign.channel,
      category: 'campaign-test',
      title: content.title,
      body: content.body,
      payload: content.payload || null,
      status: 'SENT',
      sentAt: new Date(),
    },
  })

  await prisma.auditLog.create({
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

export async function getAuditLogs(filter: AuditLogFilter): Promise<any[]> {
  const where: any = {}
  if (filter.action) where.action = filter.action
  if (filter.resourceType) where.resourceType = filter.resourceType
  if (filter.actorId) where.actorId = filter.actorId

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filter.limit || 50,
    skip: filter.offset || 0,
  })
}

export async function getAuditLogStats(): Promise<{
  totalLogs: number
  logsToday: number
  logsThisWeek: number
  topActions: Array<{ action: string; count: number }>
  topActors: Array<{ actorId: string; name: string; count: number }>
}> {
  const totalLogs = await prisma.auditLog.count()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const logsToday = await prisma.auditLog.count({ where: { createdAt: { gte: today } } })

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const logsThisWeek = await prisma.auditLog.count({ where: { createdAt: { gte: weekAgo } } })

  const actionGroups = await prisma.auditLog.groupBy({
    by: ['action'],
    _count: { action: true },
    orderBy: { _count: { action: 'desc' } },
    take: 10,
  })

  const topActions = actionGroups.map((g) => ({
    action: g.action,
    count: g._count.action,
  }))

  const actorGroups = await prisma.auditLog.groupBy({
    by: ['actorId'],
    _count: { actorId: true },
    orderBy: { _count: { actorId: 'desc' } },
    take: 10,
  })

  const topActors = await Promise.all(
    actorGroups.map(async (g) => {
      const user = g.actorId ? await prisma.user.findUnique({ where: { id: g.actorId }, select: { name: true } }) : null
      return {
        actorId: g.actorId || 'SYSTEM',
        name: user?.name || 'System',
        count: g._count.actorId,
      }
    })
  )

  return { totalLogs, logsToday, logsThisWeek, topActions, topActors }
}
